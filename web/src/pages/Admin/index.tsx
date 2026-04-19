import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';

type Tab = 'dashboard' | 'admins' | 'users' | 'recipes' | 'blogs' | 'feedback';

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, number>>({});
  const [admins, setAdmins] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [recipes, setRecipes] = useState<Record<string, unknown>[]>([]);
  const [blogs, setBlogs] = useState<Record<string, unknown>[]>([]);
  const [feedback, setFeedback] = useState<Record<string, unknown>[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiJson<{ authenticated: boolean }>('/api/admin/me');
      if (!me.authenticated) {
        navigate('/admin/login');
        return;
      }
      const [d, a, u, r, b, f] = await Promise.all([
        apiJson<Record<string, number>>('/api/admin/dashboard'),
        apiJson<{ admins: Record<string, unknown>[] }>('/api/admin/admins'),
        apiJson<{ users: Record<string, unknown>[] }>('/api/admin/users'),
        apiJson<{ recipes: Record<string, unknown>[] }>('/api/admin/recipes?status=all'),
        apiJson<{ blogs: Record<string, unknown>[] }>('/api/admin/blogs?status=all'),
        apiJson<{ feedback: Record<string, unknown>[] }>('/api/admin/feedback'),
      ]);
      setDashboard(d);
      setAdmins(a.admins ?? []);
      setUsers(u.users ?? []);
      setRecipes(r.recipes ?? []);
      setBlogs(b.blogs ?? []);
      setFeedback(f.feedback ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doAction = async (path: string, method: 'POST' | 'DELETE' = 'POST') => {
    await apiJson(path, { method });
    await load();
  };

  const logout = async () => {
    await apiJson('/api/admin/logout', { method: 'POST' });
    navigate('/admin/login');
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Console</h1>
            <p className="text-slate-500 text-sm">React + Node management panel</p>
          </div>
          <button onClick={() => void logout()} className="px-4 py-2 rounded-lg border hover:bg-slate-50">
            Logout
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 mb-4 flex gap-2 flex-wrap">
          {(['dashboard', 'admins', 'users', 'recipes', 'blogs', 'feedback'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === t ? 'bg-black text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="text-slate-500">Loading...</div>}
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        {!loading && tab === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(dashboard).map(([k, v]) => (
              <div key={k} className="bg-white rounded-xl border p-4">
                <div className="text-slate-500 text-sm">{k}</div>
                <div className="text-2xl font-bold">{v}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'users' && (
          <SimpleTable
            rows={users}
            columns={['id', 'full_name', 'email', 'created_at']}
            actions={(row) => (
              <button
                onClick={() => void doAction(`/api/admin/users/${row.id}`, 'DELETE')}
                className="text-red-600 text-sm"
              >
                Delete
              </button>
            )}
          />
        )}

        {!loading && tab === 'admins' && (
          <SimpleTable
            rows={admins}
            columns={['id', 'full_name', 'email', 'created_at']}
            actions={(row) => (
              <button
                onClick={() => void doAction(`/api/admin/admins/${row.id}/reset-password`)}
                className="text-blue-700 text-sm"
                title="Reset password to 123456"
              >
                Reset Pass
              </button>
            )}
          />
        )}

        {!loading && tab === 'recipes' && (
          <SimpleTable
            rows={recipes}
            columns={['id', 'title', 'status', 'category_name', 'author_name']}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => void doAction(`/api/admin/recipes/${row.id}/approve`)} className="text-green-700 text-sm">
                  Approve
                </button>
                <button onClick={() => void doAction(`/api/admin/recipes/${row.id}/reject`)} className="text-amber-700 text-sm">
                  Reject
                </button>
                <button onClick={() => void doAction(`/api/admin/recipes/${row.id}`, 'DELETE')} className="text-red-600 text-sm">
                  Delete
                </button>
              </div>
            )}
          />
        )}

        {!loading && tab === 'blogs' && (
          <SimpleTable
            rows={blogs}
            columns={['id', 'title', 'status', 'category_name', 'author_name']}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => void doAction(`/api/admin/blogs/${row.id}/approve`)} className="text-green-700 text-sm">
                  Approve
                </button>
                <button onClick={() => void doAction(`/api/admin/blogs/${row.id}/reject`)} className="text-amber-700 text-sm">
                  Reject
                </button>
                <button onClick={() => void doAction(`/api/admin/blogs/${row.id}`, 'DELETE')} className="text-red-600 text-sm">
                  Delete
                </button>
              </div>
            )}
          />
        )}

        {!loading && tab === 'feedback' && (
          <SimpleTable
            rows={feedback}
            columns={['id', 'name', 'email', 'message', 'created_at']}
            actions={(row) => (
              <button
                onClick={() => void doAction(`/api/admin/feedback/${row.id}`, 'DELETE')}
                className="text-red-600 text-sm"
              >
                Delete
              </button>
            )}
          />
        )}
      </div>
    </main>
  );
}

function SimpleTable({
  rows,
  columns,
  actions,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
  actions?: (row: Record<string, unknown>) => ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-semibold text-slate-600">
                {c}
              </th>
            ))}
            {actions && <th className="px-3 py-2 text-left font-semibold text-slate-600">actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-t">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 align-top">
                  {String(row[c] ?? '')}
                </td>
              ))}
              {actions && <td className="px-3 py-2">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
