import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal/Modal';
import { Button } from './ui/Button/Button';
import { useToast } from './ui/Toast/Toast';
import { proposalApi } from '../services/api/endpoints';
import { Calculator } from 'lucide-react';

interface TechOption {
  value: string;
  label: string;
}

interface TechSelectionModalProps {
  isOpen: boolean;
  proposalId: string;
  onComplete: () => void;
}

export const TechSelectionModal: React.FC<TechSelectionModalProps> = ({ isOpen, proposalId, onComplete }) => {
  const { toast } = useToast();
  const [options, setOptions] = useState<{ ui: TechOption[], backend: TechOption[], database: TechOption[] } | null>(null);
  
  const [uiTech, setUiTech] = useState('');
  const [backendTech, setBackendTech] = useState('');
  const [dbTech, setDbTech] = useState('');
  
  const [budgetInfo, setBudgetInfo] = useState<{ total_cost: number, formatted_budget: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      proposalApi.getTechOptions().then(setOptions).catch(console.error);
    }
  }, [isOpen]);

  const handleCalculateBudget = async () => {
    if (!uiTech || !backendTech || !dbTech) {
      toast('Please select all technologies.', 'error');
      return;
    }
    
    setIsCalculating(true);
    try {
      const budget = await proposalApi.calculateBudget(uiTech, backendTech, dbTech);
      setBudgetInfo(budget);
    } catch (e: any) {
      toast('Failed to calculate budget', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleResume = async () => {
    if (!budgetInfo) return;
    setIsResuming(true);
    try {
      await proposalApi.resumeProposal(proposalId, uiTech, backendTech, dbTech, budgetInfo.formatted_budget);
      toast('Technologies selected. Resuming pipeline...', 'success');
      onComplete();
    } catch (e: any) {
      toast('Failed to resume proposal', 'error');
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Select Technologies" className="max-w-xl">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Requirement analysis is complete. Please select the technologies you want to use for this project to calculate the budget and proceed with the solution design.
        </p>

        {options && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-foreground">Frontend / UI Technology</label>
              <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" value={uiTech} onChange={e => setUiTech(e.target.value)}>
                <option value="">Select UI Tech...</option>
                {options.ui.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-foreground">Backend / API Technology</label>
              <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" value={backendTech} onChange={e => setBackendTech(e.target.value)}>
                <option value="">Select Backend Tech...</option>
                {options.backend.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-foreground">Database Technology</label>
              <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" value={dbTech} onChange={e => setDbTech(e.target.value)}>
                <option value="">Select Database...</option>
                {options.database.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleCalculateBudget} isLoading={isCalculating} disabled={!uiTech || !backendTech || !dbTech} className="gap-2">
            <Calculator size={16} /> Calculate Budget
          </Button>

          {budgetInfo && (
            <div className="flex flex-col gap-4 items-center bg-muted/40 p-4 rounded-xl border border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Project Budget</span>
              <span className="text-3xl font-bold text-primary">{budgetInfo.formatted_budget}</span>
              
              <Button variant="primary" className="w-full" onClick={handleResume} isLoading={isResuming}>
                Confirm & Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
