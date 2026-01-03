use std::path::{Path, PathBuf};

pub fn project_root(workspace: &str, name: &str) -> PathBuf {
    Path::new(workspace).join(name)
}

pub fn project_file(root: &Path) -> PathBuf {
    root.join("project.json")
}

pub fn env_dir(root: &Path) -> PathBuf {
    root.join("environments")
}

pub fn env_file(root: &Path, env: &str) -> PathBuf {
    env_dir(root).join(format!("{env}.json"))
}
