import { BookOpen } from 'lucide-react';

export function DocsTab() {
  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="text-gray-400" size={24} />
        <h2 className="text-2xl font-semibold">Documentation</h2>
      </div>
      
      <div className="max-w-4xl space-y-8">
        <section className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-medium text-gray-200 mb-4">Reading Data</h3>
          <p className="text-gray-400 mb-4 text-sm">Fetch records from the database using standard filtering.</p>
          <pre className="bg-gray-900 p-4 rounded-md text-sm font-mono text-gray-300 overflow-x-auto">
{`const users = await db.user.findMany({
  where: { age: { gt: 18 } },
  orderBy: { name: 'asc' },
  limit: 10
});

return users;`}
          </pre>
        </section>

        <section className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-medium text-gray-200 mb-4">Creating Data</h3>
          <p className="text-gray-400 mb-4 text-sm">Insert a new row into the database.</p>
          <pre className="bg-gray-900 p-4 rounded-md text-sm font-mono text-gray-300 overflow-x-auto">
{`const newUser = await db.user.create({
  data: {
    name: "Alice",
    email: "alice@example.com",
    age: 28
  }
});

return newUser;`}
          </pre>
        </section>

        <section className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-medium text-gray-200 mb-4">Relational Data (Joins)</h3>
          <p className="text-gray-400 mb-4 text-sm">Fetch related records automatically using the include parameter.</p>
          <pre className="bg-gray-900 p-4 rounded-md text-sm font-mono text-gray-300 overflow-x-auto">
{`const post = await db.post.findUnique({
  where: { id: 1 },
  include: { author: true, comments: true }
});

return post;`}
          </pre>
        </section>
      </div>
    </div>
  );
}
