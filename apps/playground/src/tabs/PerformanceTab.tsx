import { useEffect, useState } from 'react';
import { Activity, Clock } from 'lucide-react';

export function PerformanceTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    fetch('http://localhost:3001/api/performance')
      .then(res => res.json())
      .then(data => {
        // Reverse so newest are at the top
        setLogs([...data].reverse());
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
    
    // Poll every 3 seconds for new queries
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading performance logs...</div>;
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="text-gray-400" size={24} />
          <h2 className="text-2xl font-semibold">Query Performance</h2>
        </div>
        <button onClick={fetchLogs} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm rounded-md transition-colors">
          Refresh
        </button>
      </div>
      
      <p className="text-gray-400 mb-6 max-w-2xl">
        Real-time log of executed SQL queries. The ORM translates your JavaScript code into these raw statements. Slow queries (over 10ms) are highlighted.
      </p>

      <div className="bg-[#161B22] border border-gray-800 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-6 text-gray-500 text-center">No queries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium w-48">Timestamp</th>
                  <th className="px-4 py-3 font-medium">SQL Statement</th>
                  <th className="px-4 py-3 font-medium w-48">Parameters</th>
                  <th className="px-4 py-3 font-medium w-32 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log, idx) => {
                  const isSlow = log.duration > 10;
                  return (
                    <tr key={idx} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3">
                        <pre className="text-xs font-mono text-blue-400 whitespace-pre-wrap">{log.sql}</pre>
                      </td>
                      <td className="px-4 py-3">
                        <pre className="text-xs font-mono text-gray-400">
                          {JSON.stringify(log.params)}
                        </pre>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 ${isSlow ? 'text-red-400' : 'text-green-400'}`}>
                          <Clock size={12} />
                          {log.duration.toFixed(2)} ms
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
