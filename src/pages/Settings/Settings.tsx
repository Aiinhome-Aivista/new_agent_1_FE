import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, FolderGit, Cpu, Tag } from 'lucide-react';
import { knowledgeApi } from '../../services/api/endpoints';
import { KnowledgeAsset } from '../../types';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { useToast } from '../../components/ui/Toast/Toast';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Asset' | 'Competency'>('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'Asset' | 'Competency'>('Asset');
  const [newCaps, setNewCaps] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await knowledgeApi.list();
      setAssets(data);
    } catch (err) {
      toast('Failed to load knowledge asset database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDesc) {
      toast('Name and description are required.', 'warning');
      return;
    }

    try {
      setSaving(true);
      await knowledgeApi.add({
        name: newName,
        description: newDesc,
        category: newCategory,
        capabilities: newCaps
      });
      toast('New RAG knowledge node added successfully.', 'success');
      
      // Reset form
      setNewName('');
      setNewDesc('');
      setNewCategory('Asset');
      setNewCaps('');
      setIsModalOpen(false);
      
      // Refresh list
      fetchAssets();
    } catch (err: any) {
      toast('Failed to add knowledge node: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter logic
  const filtered = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.description.toLowerCase().includes(search.toLowerCase()) ||
      asset.capabilities.toLowerCase().includes(search.toLowerCase());
      
    const matchesCat = categoryFilter === 'All' || asset.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Organizational Knowledge Base
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage competencies and technical assets queried by the Requirement RAG agent
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)} className="gap-2 self-start md:self-auto">
            <Plus size={16} />
            Add Knowledge Node
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search assets, tag, description..."
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
        </div>

        {/* Assets Grid */}
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
              We couldn't find any assets matching your query. Click "Add Knowledge Node" to register a new competency.
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((asset) => (
              <Card key={asset.id} className="flex flex-col justify-between hoverable">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base font-bold text-foreground leading-snug">
                      {asset.name}
                    </CardTitle>
                    <Badge variant={asset.category === 'Asset' ? 'info' : 'success'} className="gap-1 flex-shrink-0">
                      {asset.category === 'Asset' ? <FolderGit size={11} /> : <Cpu size={11} />}
                      {asset.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs pt-1 line-clamp-3 leading-relaxed">
                    {asset.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 border-t border-border/40 mt-auto bg-muted/20 pb-4 rounded-b-lg">
                  <div className="flex flex-wrap gap-1.5 items-center">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Knowledge Node">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Asset / Competency Name"
              type="text"
              placeholder="e.g. PwC Migration Blueprints"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Category</label>
              <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setNewCategory('Asset')}
                  className={`py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${
                    newCategory === 'Asset'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Reusable Asset
                </button>
                <button
                  type="button"
                  onClick={() => setNewCategory('Competency')}
                  className={`py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${
                    newCategory === 'Competency'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Core Competency
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Capabilities Keywords (comma separated)</label>
              <input
                type="text"
                placeholder="AWS, Docker, Terraform, Migration"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                value={newCaps}
                onChange={(e) => setNewCaps(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Functional Description</label>
              <textarea
                placeholder="Outline capabilities, dependencies, or delivery units..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="primary" isLoading={saving} className="w-full mt-2">
              Save to RAG Catalog
            </Button>
          </form>
        </Modal>
      </div>
    </PageWrapper>
  );
};

export default Settings;
