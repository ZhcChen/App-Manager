use std::collections::{HashMap, HashSet};

use crate::error::ProcessError;
use crate::model::{
    ApplicationGroupItem, ApplicationInstanceItem, ApplicationProcessNode, ProcessSnapshot,
    ProcessStatus,
};
use crate::query::collect_process_snapshots;

pub fn list_applications() -> Result<Vec<ApplicationGroupItem>, ProcessError> {
    let snapshots = collect_process_snapshots()?;
    Ok(build_application_groups(snapshots))
}

pub fn build_application_groups(snapshots: Vec<ProcessSnapshot>) -> Vec<ApplicationGroupItem> {
    let metadata = snapshots
        .into_iter()
        .map(|snapshot| {
            let lineage_anchor = derive_lineage_anchor(&snapshot);
            let group_identity = derive_group_identity(&snapshot);

            (
                snapshot.pid,
                SnapshotMeta {
                    snapshot,
                    lineage_anchor,
                    group_identity,
                },
            )
        })
        .collect::<HashMap<_, _>>();

    let mut roots_by_group = HashMap::<String, Vec<u32>>::new();
    let mut children_by_parent = HashMap::<u32, Vec<u32>>::new();

    for meta in metadata.values() {
        let parent_pid = meta.snapshot.parent_pid;
        let parent_meta = parent_pid.and_then(|value| metadata.get(&value));
        let shares_lineage = parent_meta
            .map(|parent| parent.lineage_anchor == meta.lineage_anchor)
            .unwrap_or(false);

        if shares_lineage {
            if let Some(parent_pid) = parent_pid {
                children_by_parent
                    .entry(parent_pid)
                    .or_default()
                    .push(meta.snapshot.pid);
            }
            continue;
        }

        roots_by_group
            .entry(meta.group_identity.key.clone())
            .or_default()
            .push(meta.snapshot.pid);
    }

    for child_pids in children_by_parent.values_mut() {
        child_pids.sort_by(|left, right| compare_processes(*left, *right, &metadata));
    }

    let mut groups = roots_by_group
        .into_iter()
        .filter_map(|(group_key, root_pids)| build_group(group_key, root_pids, &metadata, &children_by_parent))
        .collect::<Vec<_>>();

    groups.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then(left.path.to_lowercase().cmp(&right.path.to_lowercase()))
            .then(left.id.cmp(&right.id))
    });

    groups
}

fn build_group(
    group_key: String,
    mut root_pids: Vec<u32>,
    metadata: &HashMap<u32, SnapshotMeta>,
    children_by_parent: &HashMap<u32, Vec<u32>>,
) -> Option<ApplicationGroupItem> {
    root_pids.sort_by(|left, right| compare_processes(*left, *right, metadata));

    let primary = metadata.get(root_pids.first()?)?;
    let mut instances = Vec::with_capacity(root_pids.len());
    let mut total_process_count = 0usize;
    let mut contains_protected = false;

    for root_pid in root_pids {
        let instance = build_instance(root_pid, metadata, children_by_parent)?;
        total_process_count += instance.process_count;
        contains_protected |= instance.status == ProcessStatus::Protected;
        instances.push(instance);
    }

    Some(ApplicationGroupItem {
        id: format!("application:{group_key}"),
        name: primary.group_identity.display_name.clone(),
        path: primary.group_identity.display_path.clone(),
        instance_count: instances.len(),
        process_count: total_process_count,
        status: if contains_protected {
            ProcessStatus::Protected
        } else {
            ProcessStatus::Running
        },
        can_terminate: !contains_protected,
        instances,
    })
}

fn build_instance(
    root_pid: u32,
    metadata: &HashMap<u32, SnapshotMeta>,
    children_by_parent: &HashMap<u32, Vec<u32>>,
) -> Option<ApplicationInstanceItem> {
    let root = metadata.get(&root_pid)?;
    let mut visited = HashSet::new();
    let mut child_nodes = Vec::new();
    let mut process_count = 1usize;
    let mut contains_protected = root.snapshot.status == ProcessStatus::Protected;

    if let Some(child_pids) = children_by_parent.get(&root_pid) {
        for child_pid in child_pids {
            if let Some((node, node_process_count, node_contains_protected)) =
                build_process_node(*child_pid, metadata, children_by_parent, &mut visited)
            {
                process_count += node_process_count;
                contains_protected |= node_contains_protected;
                child_nodes.push(node);
            }
        }
    }

    Some(ApplicationInstanceItem {
        id: format!(
            "instance:{}:{}",
            root.snapshot.pid, root.snapshot.start_time_seconds
        ),
        pid: root.snapshot.pid,
        name: root.snapshot.name.clone(),
        path: root.snapshot.path.clone(),
        user_name: root.snapshot.user_name.clone(),
        kind_label: root.snapshot.kind_label.clone(),
        start_time_seconds: root.snapshot.start_time_seconds,
        process_count,
        status: if contains_protected {
            ProcessStatus::Protected
        } else {
            ProcessStatus::Running
        },
        can_terminate: !contains_protected,
        children: child_nodes,
    })
}

fn build_process_node(
    pid: u32,
    metadata: &HashMap<u32, SnapshotMeta>,
    children_by_parent: &HashMap<u32, Vec<u32>>,
    visited: &mut HashSet<u32>,
) -> Option<(ApplicationProcessNode, usize, bool)> {
    if !visited.insert(pid) {
        return None;
    }

    let meta = metadata.get(&pid)?;
    let mut process_count = 1usize;
    let mut contains_protected = meta.snapshot.status == ProcessStatus::Protected;
    let mut children = Vec::new();

    if let Some(child_pids) = children_by_parent.get(&pid) {
        for child_pid in child_pids {
            if let Some((node, node_process_count, node_contains_protected)) =
                build_process_node(*child_pid, metadata, children_by_parent, visited)
            {
                process_count += node_process_count;
                contains_protected |= node_contains_protected;
                children.push(node);
            }
        }
    }

    Some((
        ApplicationProcessNode {
            id: format!("process:{}:{}", meta.snapshot.pid, meta.snapshot.start_time_seconds),
            pid: meta.snapshot.pid,
            parent_pid: meta.snapshot.parent_pid,
            name: meta.snapshot.name.clone(),
            path: meta.snapshot.path.clone(),
            user_name: meta.snapshot.user_name.clone(),
            kind_label: meta.snapshot.kind_label.clone(),
            start_time_seconds: meta.snapshot.start_time_seconds,
            status: meta.snapshot.status.clone(),
            can_terminate: meta.snapshot.can_terminate,
            children,
        },
        process_count,
        contains_protected,
    ))
}

fn compare_processes(
    left_pid: u32,
    right_pid: u32,
    metadata: &HashMap<u32, SnapshotMeta>,
) -> std::cmp::Ordering {
    let left = metadata.get(&left_pid);
    let right = metadata.get(&right_pid);

    match (left, right) {
        (Some(left), Some(right)) => left
            .snapshot
            .start_time_seconds
            .cmp(&right.snapshot.start_time_seconds)
            .then(left.snapshot.pid.cmp(&right.snapshot.pid))
            .then(left.snapshot.name.to_lowercase().cmp(&right.snapshot.name.to_lowercase())),
        _ => left_pid.cmp(&right_pid),
    }
}

#[derive(Debug, Clone)]
struct SnapshotMeta {
    snapshot: ProcessSnapshot,
    lineage_anchor: String,
    group_identity: GroupIdentity,
}

#[derive(Debug, Clone)]
struct GroupIdentity {
    key: String,
    display_name: String,
    display_path: String,
}

fn derive_group_identity(snapshot: &ProcessSnapshot) -> GroupIdentity {
    if let Some(bundle_path) = extract_macos_bundle_path(&snapshot.path) {
        return GroupIdentity {
            key: format!("bundle:{}", bundle_path.to_lowercase()),
            display_name: bundle_name(&bundle_path),
            display_path: bundle_path,
        };
    }

    if snapshot.path.trim().is_empty() {
        let display_name = canonicalize_name(&snapshot.name);
        return GroupIdentity {
            key: format!("name:{display_name}"),
            display_name: snapshot.name.clone(),
            display_path: String::new(),
        };
    }

    let normalized_path = normalize_path(&snapshot.path);
    let parent_dir = path_parent(&normalized_path).unwrap_or_else(|| normalized_path.clone());
    let name_key = canonicalize_name(&snapshot.name);

    GroupIdentity {
        key: format!("path:{}#{name_key}", parent_dir.to_lowercase()),
        display_name: snapshot.name.clone(),
        display_path: snapshot.path.clone(),
    }
}

fn derive_lineage_anchor(snapshot: &ProcessSnapshot) -> String {
    if let Some(bundle_path) = extract_macos_bundle_path(&snapshot.path) {
        return format!("bundle:{}", bundle_path.to_lowercase());
    }

    if snapshot.path.trim().is_empty() {
        return format!("name:{}", canonicalize_name(&snapshot.name));
    }

    let normalized_path = normalize_path(&snapshot.path);
    let parent_dir = path_parent(&normalized_path).unwrap_or(normalized_path);
    format!("path:{}", parent_dir.to_lowercase())
}

fn normalize_path(path: &str) -> String {
    path.trim().replace('\\', "/").trim_end_matches('/').to_owned()
}

fn extract_macos_bundle_path(path: &str) -> Option<String> {
    let normalized = normalize_path(path);
    if normalized.is_empty() {
        return None;
    }

    let lowercase = normalized.to_lowercase();
    if let Some(index) = lowercase.find(".app/") {
        return Some(normalized[..index + 4].to_owned());
    }

    if lowercase.ends_with(".app") {
        return Some(normalized);
    }

    None
}

fn bundle_name(bundle_path: &str) -> String {
    let basename = bundle_path
        .rsplit('/')
        .next()
        .unwrap_or(bundle_path)
        .trim_end_matches(".app");
    basename.to_owned()
}

fn path_parent(path: &str) -> Option<String> {
    let trimmed = path.trim_end_matches('/');
    trimmed
        .rsplit_once('/')
        .map(|(parent, _)| parent.to_owned())
        .filter(|parent| !parent.is_empty())
}

fn canonicalize_name(name: &str) -> String {
    let mut normalized = name.trim().to_lowercase();

    if let Some(stripped) = normalized.strip_suffix(".exe") {
        normalized = stripped.to_owned();
    }

    for suffix in [
        " helper (renderer)",
        " helper (gpu)",
        " helper (plugin)",
        " helper (utility)",
        " helper",
        " renderer",
        " gpu process",
        " crashpad_handler",
    ] {
        if let Some(stripped) = normalized.strip_suffix(suffix) {
            normalized = stripped.trim().to_owned();
            break;
        }
    }

    normalized
}
