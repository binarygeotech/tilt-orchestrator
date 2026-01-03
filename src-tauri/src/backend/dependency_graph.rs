use std::collections::{HashMap, HashSet};

use crate::backend::project::Service;

// Detect cycles in services
pub fn detect_cycles(services: &[Service]) -> Option<Vec<String>> {
    let mut visited = HashSet::new();
    let mut stack = HashSet::new();
    let graph: HashMap<_, _> = services
        .iter()
        .map(|s| (s.name.clone(), s.depends_on.clone().unwrap_or_default()))
        .collect();

    let mut cycle = Vec::new();

    fn visit(
        node: &str,
        graph: &HashMap<String, Vec<String>>,
        visited: &mut HashSet<String>,
        stack: &mut HashSet<String>,
        cycle: &mut Vec<String>,
    ) -> bool {
        if stack.contains(node) {
            cycle.push(node.to_string());
            return true;
        }
        if visited.contains(node) {
            return false;
        }

        visited.insert(node.to_string());
        stack.insert(node.to_string());

        if let Some(deps) = graph.get(node) {
            for dep in deps {
                if visit(dep, graph, visited, stack, cycle) {
                    cycle.push(node.to_string());
                    return true;
                }
            }
        }

        stack.remove(node);
        false
    }

    for s in services {
        if visit(&s.name, &graph, &mut visited, &mut stack, &mut cycle) {
            cycle.reverse();
            return Some(cycle);
        }
    }

    None
}

// Topological sort
pub fn topo_sort(services: &[Service]) -> Vec<Service> {
    let mut visited = HashSet::new();
    let mut result = Vec::new();
    let graph: HashMap<_, _> = services
        .iter()
        .map(|s| (s.name.clone(), s.depends_on.clone().unwrap_or_default()))
        .collect();

    fn visit(
        node_name: &str,
        graph: &HashMap<String, Vec<String>>,
        visited: &mut HashSet<String>,
        services: &[Service],
        result: &mut Vec<Service>,
    ) {
        if visited.contains(node_name) {
            return;
        }
        visited.insert(node_name.to_string());

        if let Some(deps) = graph.get(node_name) {
            for dep in deps {
                visit(dep, graph, visited, services, result);
            }
        }

        if let Some(svc) = services.iter().find(|s| s.name == node_name) {
            result.push(svc.clone());
        }
    }

    for s in services {
        visit(&s.name, &graph, &mut visited, services, &mut result);
    }

    result.reverse();
    result
}