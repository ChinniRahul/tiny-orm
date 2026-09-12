import { useEffect, useState } from 'react';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';

export function MigrationsTab() {
  const [migrations, setMigrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/migrations')
      .then(res => res.json())
      .then(data => {
        setMigrations(data.executed || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading migrations...</div>;
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowRightLeft className="text-gray-400" size={24} />
        <h2 className="text-2xl font-semibold">Database Migrations</h2>
      </div>
      
      <p className="text-gray-400 mb-8 max-w-2xl">
        TinyORM tracks database schema changes using migrations. Here is the history of migrations that have been successfully applied to your local database.
      </p>
      
      <div className="bg-[#161B22] border border-gray-800 rounded-xl overflow-hidden max-w-3xl">
        {migrations.length === 0 ? (
          <div className="p-6 text-gray-500 text-center">No migrations have been executed yet.</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {migrations.map((migration, idx) => (
              <li key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-800/30 transition-colors">
                <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                <div className="flex-1 font-mono text-sm text-gray-200">{migration}</div>
                <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Applied</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
