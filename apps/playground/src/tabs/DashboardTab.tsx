import { useEffect, useState } from 'react';
import { Database, Table as TableIcon } from 'lucide-react';

export function DashboardTab() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6">Database Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => (
          <div key={stat.table} className="bg-[#161B22] border border-gray-800 rounded-xl p-6 flex flex-col items-center">
            <div className="p-3 bg-blue-500/10 rounded-full mb-4">
              <TableIcon className="text-blue-500" size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-300 capitalize mb-1">{stat.table}</h3>
            <p className="text-3xl font-bold text-gray-100">{stat.rows}</p>
            <p className="text-sm text-gray-500 mt-1">Total Records</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-6 bg-[#161B22] border border-gray-800 rounded-xl flex items-center gap-4">
        <Database className="text-green-500" size={32} />
        <div>
          <h3 className="text-lg font-medium text-gray-200">System Status</h3>
          <p className="text-gray-400">TinyORM engine is connected and running optimally.</p>
        </div>
      </div>
    </div>
  );
}
