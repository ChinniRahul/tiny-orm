import { useEffect, useState } from 'react';
import { Table as TableIcon } from 'lucide-react';

export function DatabaseTab() {
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/tables')
      .then(res => res.json())
      .then(data => {
        setTables(data);
        if (data.length > 0) {
          setSelectedTable(data[0].name);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetch(`http://localhost:3001/api/tables/${selectedTable}`)
        .then(res => res.json())
        .then(data => setTableData(data))
        .catch(err => console.error(err));
    }
  }, [selectedTable]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading tables...</div>;
  }

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar for tables */}
      <div className="w-64 border-r border-gray-800 bg-[#0E1117] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 uppercase text-xs font-semibold tracking-wider text-gray-500">
          Database Tables
        </div>
        <div className="p-2">
          {tables.map(table => (
            <div key={table.name} className="mb-1">
              <button
                onClick={() => setSelectedTable(table.name)}
                className={`w-full px-3 py-2 rounded-md cursor-pointer flex items-center text-sm transition-colors ${
                  selectedTable === table.name ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <TableIcon size={14} className="mr-2 opacity-70" />
                {table.name}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Data View */}
      <div className="flex-1 flex flex-col bg-[#0E1117] overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-[#161B22] flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-200 flex items-center">
            <TableIcon size={18} className="mr-2 text-gray-400" />
            {selectedTable}
          </h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Top 50 rows</span>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {tableData.length === 0 ? (
            <div className="text-gray-500 text-center mt-10">No data found in this table.</div>
          ) : (
            <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#161B22]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-gray-800/50 text-gray-400 border-b border-gray-800">
                    <tr>
                      {columns.map(col => (
                         <th key={col} className="px-4 py-3 font-medium tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30">
                        {columns.map(col => (
                          <td key={col} className="px-4 py-3 whitespace-nowrap">
                            {row[col] !== null ? String(row[col]) : <span className="text-gray-600 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
