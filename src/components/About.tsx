import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ArrowLeft, ExternalLink, Github, Heart, Package } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
}

export default function About({ onBack }: AboutProps) {
  const handleOpenLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl">Tilt Orchestrator</CardTitle>
            <CardDescription className="text-base mt-2">
              A modern desktop application for managing microservices development with Tilt
            </CardDescription>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                Version 0.1.0
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">About This Application</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tilt Orchestrator simplifies the management of microservices development environments.
                It provides an intuitive GUI for creating, configuring, and managing multi-service
                projects with support for Docker, Kubernetes, Helm, and Kustomize deployments.
              </p>
            </div>

            <Separator />

            {/* Features */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Key Features</h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Visual project management with multi-environment support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Support for Docker, Kubernetes, Helm, and Kustomize</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Real-time Tilt log viewer and process management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Git repository cloning and IDE integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Template-based Tiltfile and K8s manifest generation</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* Technology Stack */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Built With</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>Tauri 2.0</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>React 18</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>TypeScript</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>Rust</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>Tailwind CSS</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>Shadcn/ui</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Links */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Links & Resources</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    handleOpenLink('https://github.com/binarygeotech/tilt-orchestrator')
                  }
                >
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    handleOpenLink('https://github.com/binarygeotech/tilt-orchestrator/issues')
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Report an Issue
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleOpenLink('https://tilt.dev')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Learn About Tilt
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Credits */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                <span>by the Tilt Orchestrator team</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500">
                © 2026 Tilt Orchestrator Contributors. Licensed under MIT License.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
