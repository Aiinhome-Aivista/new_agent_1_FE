import React, { useState, useEffect, useRef } from 'react';
import { FileUp, FileText, Trash2, Plus, X, Cpu, CheckCircle2 } from 'lucide-react';
import { caseStudiesApi } from '../../services/api/endpoints';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { useToast } from '../../components/ui/Toast/Toast';

const CaseStudies: React.FC = () => {
  const { toast } = useToast();
  const [caseStudies, setCaseStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCaseStudies = async () => {
    try {
      setLoading(true);
      const data = await caseStudiesApi.list();
      setCaseStudies(data);
    } catch (err) {
      toast('Failed to load case studies database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseStudies();
  }, []);

  const validateFiles = (files: File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => {
      const isAllowedType = 
        file.name.toLowerCase().endsWith('.doc') || 
        file.name.toLowerCase().endsWith('.docx') || 
        file.name.toLowerCase().endsWith('.txt') || 
        file.name.toLowerCase().endsWith('.pdf');
      const isWithinSize = file.size <= MAX_FILE_SIZE;
      
      if (!isAllowedType) {
        toast(`File ${file.name} is not supported. Only .doc, .txt, .pdf are allowed.`, 'error');
      } else if (!isWithinSize) {
        toast(`File ${file.name} exceeds the 10MB limit.`, 'error');
      }
      
      return isAllowedType && isWithinSize;
    });
    return validFiles;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = validateFiles(Array.from(e.target.files));
      setSelectedFiles(validFiles); // Only allow one case study document at a time
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(Array.from(e.dataTransfer.files));
      setSelectedFiles(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('files', selectedFiles[0]);

      toast('Parsing and summarizing case study via specialist Solution Architect LLM. Please wait...', 'info');
      await caseStudiesApi.upload(formData);
      toast('Case study analyzed and stored in vector database successfully!', 'success');

      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchCaseStudies();
    } catch (err: any) {
      toast('Failed to process case study: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this case study?')) return;
    try {
      await caseStudiesApi.delete(id);
      toast('Case study deleted successfully.', 'success');
      fetchCaseStudies();
    } catch (err: any) {
      toast('Failed to delete case study: ' + err.message, 'error');
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header section */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-primary" size={24} />
            Case Studies Repository
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload case studies from previous project documents. The LLM parses, structures, and embeds them into the proposals database for automatic slide matching.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Uploader Left Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Plus size={16} className="text-primary" />
                  Upload Previous Case Study
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload a single document outlining challenges, approach, and architectural decisions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="flex flex-col gap-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${isDragActive ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragOver}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <FileUp size={32} className="text-muted-foreground" />
                    <div className="text-xs text-muted-foreground text-center">
                      <span className="font-semibold text-primary hover:underline">
                        Click to upload
                      </span> or drag & drop file
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-muted/40 border border-border rounded-lg">
                      <div className="flex items-center gap-2 text-xs truncate max-w-[80%]">
                        <FileText size={16} className="text-primary" />
                        <span className="truncate font-medium">{selectedFiles[0].name}</span>
                      </div>
                      <X
                        size={16}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSelectedFiles([]);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full gap-2 text-xs h-9"
                    disabled={selectedFiles.length === 0 || uploadLoading}
                    isLoading={uploadLoading}
                  >
                    <Cpu size={14} />
                    {uploadLoading ? 'Processing with LLM...' : 'Analyze & Store Case Study'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List Table Right Card */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Processed Case Studies
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and manage the parsed case study architectures and outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">Loading case studies...</span>
                  </div>
                ) : caseStudies.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <FileText className="mx-auto text-muted-foreground/50 mb-3" size={36} />
                    <h3 className="text-xs font-bold text-foreground">No Case Studies Uploaded</h3>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1">
                      Upload previous project documents to automatically parse and include them in generated PowerPoint presentations.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                          <th className="p-3">Project Name</th>
                          <th className="p-3">Client Industry</th>
                          <th className="p-3">Technologies</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseStudies.map((cs) => (
                          <tr key={cs.id} className="border-b border-border last:border-0 hover:bg-muted/10 text-xs">
                            <td className="p-3 font-semibold text-foreground truncate max-w-[150px]" title={cs.project_name}>
                              {cs.project_name}
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[150px]" title={cs.client_industry}>
                              {cs.client_industry}
                            </td>
                            <td className="p-3 truncate max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {cs.key_technologies.split(',').slice(0, 3).map((tech: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[9px] py-0 px-1.5">
                                    {tech.trim()}
                                  </Badge>
                                ))}
                                {cs.key_technologies.split(',').length > 3 && (
                                  <span className="text-[9px] text-muted-foreground">+{cs.key_technologies.split(',').length - 3}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 mx-auto"
                                onClick={() => handleDelete(cs.id)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
};

export default CaseStudies;
