import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Plus, X, Check, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface EnvVarEditorProps {
  envVars: Record<string, string>;
  onChange: (envVars: Record<string, string>) => void;
  title?: string;
  description?: string;
}

export default function EnvVarEditor({ 
  envVars, 
  onChange, 
  title = 'Environment Variables',
  description = 'Manage environment variables'
}: EnvVarEditorProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonError, setJsonError] = useState('');
  const [jsonValue, setJsonValue] = useState(JSON.stringify(envVars, null, 2));
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');

  const handleAddVar = () => {
    if (editingKey.trim()) {
      onChange({
        ...envVars,
        [editingKey]: editingValue,
      });
      setEditingKey('');
      setEditingValue('');
    }
  };

  const handleRemoveVar = (key: string) => {
    const newVars = { ...envVars };
    delete newVars[key];
    onChange(newVars);
  };

  const handleUpdateVar = (oldKey: string, newKey: string, value: string) => {
    const newVars = { ...envVars };
    if (oldKey !== newKey) {
      delete newVars[oldKey];
    }
    newVars[newKey] = value;
    onChange(newVars);
  };

  const handleJsonChange = (value: string | undefined) => {
    if (!value) return;
    
    setJsonValue(value);
    setJsonError('');
    
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a valid JSON object');
        return;
      }
      onChange(parsed);
    } catch (error: any) {
      setJsonError(error.message);
    }
  };

  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'json' : 'form';
    setMode(newMode);
    
    if (newMode === 'json') {
      setJsonValue(JSON.stringify(envVars, null, 2));
      setJsonError('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="editor-mode" className="text-sm">
              {mode === 'form' ? 'Form' : 'JSON'}
            </Label>
            <Switch
              id="editor-mode"
              checked={mode === 'json'}
              onCheckedChange={handleModeChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'form' ? (
          <div className="space-y-4">
            {/* Existing Variables */}
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="KEY"
                      defaultValue={key}
                      onBlur={(e) => {
                        if (e.target.value !== key) {
                          handleUpdateVar(key, e.target.value, value);
                        }
                      }}
                    />
                    <Input
                      placeholder="value"
                      defaultValue={value}
                      onBlur={(e) => {
                        if (e.target.value !== value) {
                          handleUpdateVar(key, key, e.target.value);
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveVar(key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Variable */}
            <div className="border-t pt-4 mt-4">
              <div className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="KEY"
                    value={editingKey}
                    onChange={(e) => setEditingKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddVar();
                      }
                    }}
                  />
                  <Input
                    placeholder="value"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddVar();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddVar}
                  disabled={!editingKey.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {Object.keys(envVars).length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                No environment variables. Add one above to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {jsonError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
            {!jsonError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>Valid JSON</span>
              </div>
            )}
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="400px"
                defaultLanguage="json"
                value={jsonValue}
                onChange={handleJsonChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
