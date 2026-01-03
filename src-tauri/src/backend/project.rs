use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub name: String,
    pub path: Option<String>,
    pub port: u16,
    pub enabled: bool,
    pub repo: Option<Repo>,
    pub docker: Option<Docker>,
    pub k8s: Option<K8s>,
    pub env: Option<HashMap<String, String>>,
    pub depends_on: Option<Vec<String>>,
    pub helm: Option<Helm>,
    pub kustomize: Option<Kustomize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repo {
    pub url: String,
    pub branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Docker {
    pub context: String,
    pub dockerfile: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8s {
    pub manifests: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Helm {
    pub chart: String,
    pub values: Option<HashMap<String, serde_json::Value>>,
    pub namespace: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Kustomize {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub project: ProjectInfo,
    pub environments: HashMap<String, Environment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub workspace_path: String,
    pub tilt: Tilt,
    pub services_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tilt {
    pub mode: TiltMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TiltMode {
    Root,
    PerRepo,
    Hybrid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub shared_env: HashMap<String, String>,
    pub services: Vec<Service>,
}
