import { useState, useEffect } from 'react';
import { Database, Play, LayoutDashboard, Table, ArrowRightLeft, Activity, BookOpen } from 'lucide-react';
import Editor from '@monaco-editor/react';

import { DashboardTab } from './tabs/DashboardTab';
import { DatabaseTab } from './tabs/DatabaseTab';
import { MigrationsTab } from './tabs/MigrationsTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { DocsTab } from './tabs/DocsTab';

// Default code in the editor
const DEFAULT_CODE = `// Welcome to TinyORM Playground!
// Try running a query:

const users = await db.user.findMany({
  where: {
    age: { gt: 20 }
  },
  orderBy: {
    name: "asc"
  },
  limit: 10
});

return users;
`;

export default function App() {
  const [activeTab, setActiveTab] = useState('query');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [sql, setSql] = useState<string>('');
  const [params, setParams] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<any>(null);
  
  useEffect(() => {
    fetch('http://localhost:3001/api/schema')
      .then(res => res.json())
      .then(data => setSchema(data))
      .catch(err => console.error('Failed to fetch schema', err));
  }, []);

  const handleRunQuery = async () => {
    try {
      setError(null);
      
      // A very simple regex parser to extract model, action, and arguments for the demo.
      // In a production app, we'd use a real AST parser (like Acorn or TS Compiler API in the browser)
      // to convert the code to the JSON payload.
      // For this assignment, we'll use a regex to extract the model and action,
      // and extract the object passed to it.
      
      const modelMatch = code.match(/db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\(([\s\S]*?)\)/);
      
      if (!modelMatch) {
        throw new Error("Could not parse query. Please use the format: db.model.action({...})");
      }
      
      const model = modelMatch[1];
      const action = modelMatch[2];
      const argsString = modelMatch[3].trim();
      
      let args = {};
      if (argsString && argsString !== '') {
        // Evaluate the args string to a JS object (safe enough in this local playground context)
        // using Function constructor to avoid eval scope issues
        args = new Function(`return ${argsString}`)();
      }

      const response = await fetch('http://localhost:3001/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, action, args })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }
      
      setResults(data.result);
      setDuration(data.duration);
      
      // Simulate SQL logging output for the demo UI based on what we'd expect
      // The real backend logs it to console, but we want to show it in UI
      setSql(`-- See backend terminal for exact generated SQL and params\n-- Query executed successfully in ${data.duration.toFixed(2)}ms`);
      setParams([]);
      
    } catch (err: any) {
      setError(err.message);
      setResults(null);
      setDuration(null);
      setSql('');
    }
  };

  return (
    <div className="flex h-screen bg-[#0E1117] text-gray-300 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-16 flex flex-col items-center py-6 border-r border-gray-800 bg-[#161B22]">
        <div className="mb-8 p-2 rounded-xl bg-blue-600/20 text-blue-500">
          <Database size={24} />
        </div>
        <nav className="flex flex-col gap-6 w-full">
          <NavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Play size={20} />} active={activeTab === 'query'} onClick={() => setActiveTab('query')} />
          <NavItem icon={<Table size={20} />} active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
          <NavItem icon={<ArrowRightLeft size={20} />} active={activeTab === 'migrations'} onClick={() => setActiveTab('migrations')} />
          <NavItem icon={<Activity size={20} />} active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} />
          <NavItem icon={<BookOpen size={20} />} active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-gray-800 flex items-center px-6 bg-[#161B22]">
          <h1 className="font-semibold text-gray-200">TinyORM</h1>
          <span className="ml-3 text-xs px-2 py-1 bg-gray-800 rounded-md text-gray-400">v1.0.0</span>
        </header>

        {activeTab === 'query' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Panel: Schema explorer */}
            <div className="w-full md:w-64 border-b md:border-r border-gray-800 bg-[#0E1117] md:overflow-y-auto hidden md:block">
              <div className="p-4 border-b border-gray-800 uppercase text-xs font-semibold tracking-wider text-gray-500">
                Database Tables
              </div>
              <div className="p-2 flex overflow-x-auto md:flex-col md:overflow-x-visible">
                {schema ? Object.entries(schema).map(([modelName, def]: [string, any]) => (
                  <div key={modelName} className="mb-2 mr-2 md:mr-0 flex-shrink-0">
                    <div className="px-3 py-2 hover:bg-gray-800 rounded-md cursor-pointer flex items-center text-sm">
                      <Table size={14} className="mr-2 text-gray-500" />
                      {def.tableName}
                    </div>
                  </div>
                )) : (
                  <div className="px-3 py-2 text-sm text-gray-500">Loading schema...</div>
                )}
              </div>
            </div>

            {/* Center: Editor */}
            <div className="flex-[2] flex flex-col border-b md:border-r border-gray-800 min-h-[50vh] md:min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#161B22]">
                <div className="text-sm font-medium">Query Editor</div>
                <button 
                  onClick={handleRunQuery}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                >
                  <Play size={12} fill="currentColor" /> Run Query
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 16 }
                  }}
                />
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="w-full md:w-1/3 flex flex-col bg-[#0E1117] min-h-[40vh] md:min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#161B22]">
                <div className="text-sm font-medium">Results</div>
                {duration && <div className="text-xs text-gray-500">{duration.toFixed(2)} ms</div>}
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                    {error}
                  </div>
                )}
                
                {!error && results && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-[#161B22] border border-gray-800 rounded-lg overflow-hidden">
                      <div className="bg-gray-800/50 px-3 py-2 text-xs font-mono text-gray-400 border-b border-gray-800">
                        Generated SQL (Simulated)
                      </div>
                      <div className="p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap">
                        {sql}
                      </div>
                    </div>
                    
                    <div className="bg-[#161B22] border border-gray-800 rounded-lg overflow-hidden">
                      <div className="bg-gray-800/50 px-3 py-2 text-xs font-mono text-gray-400 border-b border-gray-800">
                        Data
                      </div>
                      <div className="p-3">
                        <pre className="text-xs text-green-400 overflow-x-auto">
                          {JSON.stringify(results, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                
                {!error && !results && (
                  <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                    Run a query to see results
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'database' && <DatabaseTab />}
        {activeTab === 'migrations' && <MigrationsTab />}
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'docs' && <DocsTab />}
      </main>
    </div>
  );
}

function NavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex justify-center w-full py-2 transition-colors ${
        active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r-full" />
      )}
      {icon}
    </button>
  );
}
