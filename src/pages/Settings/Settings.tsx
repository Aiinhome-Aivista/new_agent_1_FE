import React, { useState, useEffect } from 'react';
import {
  Database, Plus, Search, FolderGit, Cpu, Tag, Edit, Trash2,
  RefreshCw, Lock, Eye, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { knowledgeApi } from '../../services/api/endpoints';
import { KnowledgeAsset } from '../../types';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { useToast } from '../../components/ui/Toast/Toast';
import { useRolePermissions } from '../../hooks';
import { useAuthStore } from '../../store';

// ── Inline permission legend shown to all users ──────────────
const ROLE_ACCESS_MATRIX = [
  { role: 'Pre-Sales / Solution Architect', view: true, readOnly: false, upload: true,  edit: true,  del: false, reindex: true,  color: 'text-blue-500',   dot: 'bg-blue-500' },
  { role: 'Bid / Proposal Manager',         view: true, readOnly: false, upload: false, edit: false, del: false, reindex: false, color: 'text-violet-500', dot: 'bg-violet-500' },
  { role: 'Delivery Lead',                  view: true, readOnly: true,  upload: false, edit: false, del: false, reindex: false, color: 'text-emerald-500',dot: 'bg-emerald-500' },
  { role: 'Reviewing Partner',              view: true, readOnly: true,  upload: false, edit: false, del: false, reindex: false, color: 'text-amber-500',  dot: 'bg-amber-500' },
  { role: 'Admin (recommended)',            view: true, readOnly: false, upload: true,  edit: true,  del: true,  reindex: true,  color: 'text-rose-500',   dot: 'bg-rose-500' },
];

const Tick = () => <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />;
const Cross = () => <ShieldAlert size={13} className="text-rose-400 flex-shrink-0" />;

const Settings: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const perms = useRolePermissions();

  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Asset' | 'Competency'>('All');
  const [reindexing, setReindexing] = useState(false);

  // ── Add modal state ─────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFiles, setFormFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Delete confirm ───────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await knowledgeApi.list();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast('Failed to load knowledge asset database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'presales') {
      fetchAssets();
    }
  }, [user]);

  if (user?.role !== 'admin' && user?.role !== 'presales') {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <ShieldAlert size={48} className="text-destructive opacity-80" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Your role ({user?.role}) does not have permission to view the Asset Knowledge Base. This section is restricted to Pre-Sales Architects and Administrators.
          </p>
        </div>
      </PageWrapper>
    );
  }

  // ── Open modal ───────────────────────────────────────────
  const openAddModal = () => {
    setFormFiles(null);
    setIsModalOpen(true);
  };

  // ── Save (upload files) ───────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFiles || formFiles.length === 0) {
      toast('Please select at least one file to upload.', 'error');
      return;
    }
    
    const formData = new FormData();
    for (let i = 0; i < formFiles.length; i++) {
      formData.append('files', formFiles[i]);
    }

    try {
      setSaving(true);
      await knowledgeApi.upload(formData);
      toast('Knowledge base files uploaded successfully.', 'success');
      setIsModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      toast('Failed to upload: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await knowledgeApi.delete(deleteTarget.id);
      toast(`"${deleteTarget.name}" removed from knowledge base.`, 'success');
      setDeleteTarget(null);
      fetchAssets();
    } catch (err: any) {
      toast('Delete failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Re-index ─────────────────────────────────────────────
  const handleReindex = async () => {
    try {
      setReindexing(true);
      const res = await knowledgeApi.reindex();
      toast(res.message || 'Re-indexing complete.', 'success');
    } catch (err: any) {
      toast('Re-index failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setReindexing(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────
  const filtered = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.description.toLowerCase().includes(search.toLowerCase()) ||
      asset.capabilities.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || asset.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Organizational Knowledge Base
            </h2>
            {/* <p className="text-sm text-muted-foreground mt-1">
              Manage competencies and technical assets queried by the Requirement RAG agent
            </p> */}

            {/* Role access notice */}
            {(!perms.canUploadKnowledge) && (
              <div className="flex items-center gap-2 mt-3 text-xs px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg w-fit">
                <Eye size={13} />
                <span>
                  <strong>{perms.displayRole}</strong> — Read-Only access. Contact Pre-Sales or Admin to add or edit nodes.
                </span>
              </div>
            )}
          </div>

          {/* Action buttons — gated */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* {perms.canReindexKnowledge && (
              <Button
                variant="outline"
                className="gap-2 text-sm"
                onClick={handleReindex}
                isLoading={reindexing}
                title="Re-index all knowledge nodes into the RAG vector store"
              >
                <RefreshCw size={14} />
                Re-index RAG Store
              </Button>
            )} */}
            {perms.canUploadKnowledge ? (
              <Button variant="primary" onClick={openAddModal} className="gap-2">
                <Plus size={16} />
                Add Knowledge Base
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-2 border border-border rounded-lg bg-muted/20">
                <Lock size={12} />
                <span>Upload restricted to Pre-Sales & Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Permission Matrix collapsible ───────────────── */}
        <details className="group">
          <summary className="text-xs font-bold text-muted-foreground cursor-pointer select-none flex items-center gap-2 list-none pb-1">
            <ShieldAlert size={13} className="text-primary" />
            Role Access Matrix — Knowledge Base
            <span className="ml-auto text-[12px] opacity-80 group-open:hidden">Click to expand</span>
          </summary>
          <div className="mt-3 border border-border rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left p-2.5 font-bold">Role</th>
                  <th className="text-center p-2.5 font-bold">View</th>
                  <th className="text-center p-2.5 font-bold">Upload</th>
                  <th className="text-center p-2.5 font-bold">Edit</th>
                  <th className="text-center p-2.5 font-bold">Delete</th>
                  <th className="text-center p-2.5 font-bold">Re-index</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ACCESS_MATRIX.map((r, idx) => (
                  <tr key={r.role} className={`border-b border-border/50 ${idx === ROLE_ACCESS_MATRIX.length - 1 ? 'border-0' : ''}`}>
                    <td className="p-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${r.dot}`} />
                        <span className={`font-semibold ${r.color}`}>{r.role}</span>
                      </span>
                    </td>
                    <td className="text-center p-2.5">
                      <div className="flex justify-center items-center gap-1">
                        {r.view ? <Tick /> : <Cross />}
                        {r.readOnly && <span className="text-[10px] text-muted-foreground">(Read Only)</span>}
                      </div>
                    </td>
                    {[r.upload, r.edit, r.del, r.reindex].map((v, i) => (
                      <td key={i} className="text-center p-2.5">
                        <div className="flex justify-center">
                          {v ? <Tick /> : <Cross />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* ── Toolbar ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search assets, tags, description..."
              className="pl-9 pr-4 py-2 border border-input rounded-lg w-full text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex bg-muted p-1 rounded-lg border border-border self-stretch sm:self-auto">
            {(['All', 'Asset', 'Competency'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}s
              </button>
            ))}
          </div>

          <div className="ml-auto text-xs text-muted-foreground flex-shrink-0">
            {filtered.length} / {assets.length} items
          </div>
        </div>

        {/* ── Asset Grid ──────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-card rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <Database size={32} className="text-muted-foreground mb-4" />
            <CardTitle className="text-base text-foreground mb-1">No Knowledge Items Found</CardTitle>
            <CardDescription className="text-xs max-w-sm">
              {perms.canUploadKnowledge
                ? 'Click "Add Knowledge Node" to register a new competency or asset.'
                : 'No assets match your current search or filter.'}
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((asset) => (
              <Card key={asset.id} className="flex flex-col justify-between hoverable group transition-all">
                <CardHeader className="pb-3">
                  <div className="flex lg:flex-col xl:flex-row items-start justify-between gap-4">
                    <CardTitle className="text-base font-bold text-foreground leading-snug">
                      {asset.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={asset.category === 'Asset' ? 'info' : 'success'} className="gap-1">
                        {asset.category === 'Asset' ? <FolderGit size={11} /> : <Cpu size={11} />}
                        {asset.category}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs pt-1 line-clamp-3 leading-relaxed">
                    {asset.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2 border-t border-border/40 mt-auto bg-muted/20 pb-4 rounded-b-lg">
                  {/* Tag chips */}
                  <div className="flex flex-wrap gap-1.5 items-center mb-3">
                    <Tag size={12} className="text-muted-foreground mr-1" />
                    {asset.capabilities.split(',').map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-card border border-border px-2 py-0.5 rounded font-medium text-foreground/80 hover:text-primary transition-colors"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Action buttons — role-gated */}
                  {perms.canDeleteKnowledge && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] gap-1 text-destructive hover:bg-destructive/10 border-destructive/30 ml-auto"
                        onClick={() => setDeleteTarget(asset)}
                      >
                        <Trash2 size={11} />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}



        {/* ── Add Knowledge Modal ───────────────────────── */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Knowledge Base Files"
          className="max-w-md"
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Upload documents (PDF, DOCX, TXT) to expand the knowledge base. The system will automatically parse and index them into the Vector & Graph databases.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Select Files</label>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setFormFiles(e.target.files)}
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium hover:file:cursor-pointer"
                required
              />
            </div>

            <Button type="submit" variant="primary" isLoading={saving} className="w-full mt-2">
              Upload and Index Files
            </Button>
          </form>
        </Modal>

        {/* ── Delete Confirmation Modal ────────────────────── */}
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Confirm Deletion"
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              <Trash2 size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Permanently delete this node?</p>
                <p className="text-xs mt-1 opacity-80">
                  <strong>"{deleteTarget?.name}"</strong> will be removed from the knowledge base and will no longer be
                  available to the Requirement RAG agent. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" isLoading={deleting} onClick={handleDelete} className="gap-2">
                <Trash2 size={14} />
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </PageWrapper>
  );
};

export default Settings;
