import { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import CreateProjectForm from './components/CreateProjectForm';
import ProjectView from './components/ProjectView';
import ProjectManagement from './components/ProjectManagement';
import Settings from './components/Settings';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';
import { Project } from './types/project';
import { openProject } from './api';
import { AppStateProvider } from './providers/appstate-provider';

type Screen = 'landing' | 'create-project' | 'project-view' | 'project-management' | 'settings';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const handleCreateProject = () => {
    setCurrentScreen('create-project');
  };

  const handleOpenProject = async (path: string, _name: string) => {
    try {
      const project = await openProject(path)

      setCurrentProject(JSON.parse(project as string));
      setCurrentScreen('project-view');

      // await message("Project created successfully.", { title: 'New Project', kind: 'info' });
    } catch (err) {
      console.error('Failed to load project', err)
      // await message('Failed to create project: ' + err, { title: 'New Project', kind: 'error' });
    }
  };

  const handleProjectCreated = (project: Project) => {
    setCurrentProject(project);
    setCurrentScreen('project-view');
  };

  const handleEditProject = () => {
    setCurrentScreen('project-management');
  };

  const handleProjectSaved = (project: Project) => {
    setCurrentProject(project);
    setCurrentScreen('project-view');
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
    setCurrentProject(null);
  };

  return (
    <AppStateProvider>
      <ThemeProvider>
        <ThemeToggle />
        {currentScreen === 'landing' && (
          <LandingScreen
            onCreateProject={handleCreateProject}
            onOpenProject={handleOpenProject}
            onOpenSettings={handleOpenSettings}
          />
        )}
        {currentScreen === 'create-project' && (
          <CreateProjectForm
            onBack={handleBackToLanding}
            onProjectCreated={handleProjectCreated}
          />
        )}
        {currentScreen === 'settings' && (
          <Settings onBack={handleBackToLanding} />
        )}
        {currentScreen === 'project-view' && currentProject && (
          <ProjectView
            project={currentProject}
            onBack={handleBackToLanding}
            onEdit={handleEditProject}
          />
        )}
        {currentScreen === 'project-management' && currentProject && (
          <ProjectManagement
            project={currentProject}
            onBack={handleBackToLanding}
            onSave={handleProjectSaved}
          />
        )}
      </ThemeProvider>
    </AppStateProvider>
  );
}

export default App;
