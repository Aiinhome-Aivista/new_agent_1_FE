import React from 'react';
import { 
  Clock, 
  Layers, 
  ShieldCheck, 
  Activity, 
  TrendingUp,
  FileText
} from 'lucide-react';

interface ComponentProps {
  type: string;
  props: any;
  platform: 'mobile' | 'web';
}

export const DynamicScreenRenderer: React.FC<{ screen: any; platform: 'mobile' | 'web' }> = ({ screen, platform }) => {
  if (!screen) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <Layers size={36} className="text-slate-600 mb-2 animate-bounce" />
        <p className="text-sm">No screen selected or empty specification.</p>
      </div>
    );
  }

  const isMobile = platform === 'mobile';

  return (
    <div className={`space-y-4 font-sans select-none ${isMobile ? 'text-[13px]' : 'text-sm'} text-slate-200`}>
      {/* Screen Header Bar */}
      <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-white tracking-tight ${isMobile ? 'text-sm' : 'text-base'}`}>
              {screen.name || 'Untitled Screen'}
            </h3>
            {screen.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider font-semibold">
                {screen.category}
              </span>
            )}
          </div>
          {screen.description && (
            <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">
              {screen.description}
            </p>
          )}
        </div>
      </div>

      {/* Screen Components */}
      <div className="space-y-3.5">
        {screen.components && screen.components.length > 0 ? (
          screen.components.map((comp: any, idx: number) => (
            <ComponentWidget key={idx} type={comp.type} props={comp.props || {}} platform={platform} />
          ))
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            No UI components defined for this screen yet. Use the Copilot to add components.
          </div>
        )}
      </div>
    </div>
  );
};

const ComponentWidget: React.FC<ComponentProps> = ({ type, props, platform }) => {
  const isMobile = platform === 'mobile';

  // 1. STATS GRID
  if (type === 'stats_grid') {
    const items = props.items || [];
    return (
      <div className="space-y-2">
        {props.title && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <TrendingUp size={13} className="text-blue-400" />
            <span>{props.title}</span>
          </div>
        )}
        <div className={`grid gap-2.5 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {items.map((item: any, i: number) => {
            const raw = typeof item === 'string' ? item : `${item.label || 'Metric'}: ${item.value || ''}`;
            const parts = raw.split(':');
            const label = parts[0]?.trim() || 'KPI';
            const value = parts.slice(1).join(':')?.trim() || parts[0];

            return (
              <div 
                key={i} 
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition p-3 rounded-xl shadow-sm flex flex-col justify-between"
              >
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium truncate block mb-1">
                  {label}
                </span>
                <span className={`font-bold text-blue-400 ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. ACTION CARD / DECISION INTERFACE
  if (type === 'action_card') {
    return (
      <div className="bg-slate-900/95 border border-slate-800 hover:border-blue-500/30 transition p-3.5 rounded-xl space-y-2.5 shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>{props.title || 'Action Required'}</span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            Pending
          </span>
        </div>
        {props.description && (
          <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            {props.description}
          </p>
        )}
        {props.actions && Array.isArray(props.actions) && props.actions.length > 0 && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {props.actions.map((act: string, aIdx: number) => {
              const isPrimary = aIdx === 0;
              const isDestructive = act.toLowerCase().includes('reject') || act.toLowerCase().includes('delete');
              return (
                <button
                  key={aIdx}
                  type="button"
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    isDestructive 
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                      : isPrimary 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  onClick={() => alert(`Simulated Action Triggered: "${act}"`)}
                >
                  {act}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 3. ACTION / DATA TABLE
  if (type === 'action_table' || type === 'table') {
    const columns: string[] = props.columns || ['Item', 'Role', 'Status', 'Action'];
    const rows: any[] = props.rows || [
      { col_1: 'Data Pipeline Ingestion', col_2: 'Active', status: 'Healthy', action: 'Inspect' },
      { col_1: 'Vector Embeddings Index', col_2: 'Completed', status: 'Optimal', action: 'Sync' }
    ];

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {props.title && (
          <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-400" />
              {props.title}
            </span>
            <span className="text-[10px] text-slate-400">{rows.length} records</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                {columns.map((c, idx) => (
                  <th key={idx} className="py-2 px-3 font-semibold uppercase tracking-wider text-[9px]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((r, rIdx) => {
                const values = Array.isArray(r) ? r : Object.values(r);
                return (
                  <tr key={rIdx} className="hover:bg-slate-800/40 transition">
                    {values.map((val: any, cIdx: number) => {
                      const str = String(val);
                      const isStatus = str.toLowerCase().includes('pending') || str.toLowerCase().includes('active') || str.toLowerCase().includes('review');
                      return (
                        <td key={cIdx} className="py-2 px-3 text-slate-300">
                          {isStatus ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                              {str}
                            </span>
                          ) : (
                            str
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 4. TIMELINE / VELOCITY CHART
  if (type === 'timeline_chart') {
    const stages = props.stages || ['Discovery', 'MVP Delivery', 'Enterprise Scale'];
    return (
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Clock size={13} className="text-amber-400" />
            {props.title || 'Roadmap & Milestones'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Simulated Velocity</span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 overflow-x-auto">
          {stages.map((stage: string, sIdx: number) => (
            <div key={sIdx} className="flex-1 flex flex-col items-center text-center min-w-[70px]">
              <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-400 text-blue-300 flex items-center justify-center text-[10px] font-bold mb-1 shadow-sm">
                {sIdx + 1}
              </div>
              <span className="text-[10px] text-slate-300 font-medium leading-tight">
                {stage}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. FORM INPUT FIELDS
  if (type === 'input_field' || type === 'input') {
    return (
      <div className="space-y-1 bg-slate-900/70 border border-slate-800 p-3 rounded-xl shadow-sm">
        <label className="text-[11px] font-medium text-slate-300 block">
          {props.label || 'Input Field'}
        </label>
        <input 
          type={props.type || 'text'}
          placeholder={props.placeholder || `Enter ${props.label || 'value'}...`}
          readOnly
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none cursor-default"
        />
      </div>
    );
  }

  // 6. BUTTON / ACTION BUTTON
  if (type === 'button') {
    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => alert(`Simulated Action: "${props.title || props.action || 'Submit'}"`)}
          className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>{props.title || props.action || 'Execute'}</span>
        </button>
      </div>
    );
  }

  // 7. IMAGE / HERO BANNER / GRAPHIC
  if (type === 'image' || type === 'banner') {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-sm space-y-1">
        {props.title && (
          <div className="px-3 pt-2 text-xs font-semibold text-slate-300">
            {props.title}
          </div>
        )}
        <div className="relative w-full overflow-hidden bg-slate-900 flex items-center justify-center min-h-[140px] max-h-[260px]">
          {props.src || props.image_url ? (
            <img 
              src={props.src || props.image_url} 
              alt={props.alt || props.title || 'Screen mock visual'} 
              className="w-full h-auto object-cover max-h-[260px] rounded-b-xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-slate-500 text-center gap-1">
              <FileText size={24} className="text-slate-600 mb-1" />
              <span className="text-xs font-medium text-slate-400">{props.title || 'Visual Graphic Area'}</span>
              <span className="text-[10px] text-slate-600">Dynamic image asset or screenshot</span>
            </div>
          )}
        </div>
        {props.caption && (
          <p className="px-3 pb-2 text-[10px] text-slate-400 italic">
            {props.caption}
          </p>
        )}
      </div>
    );
  }

  // Fallback for custom or unknown component types
  return (
    <div className="p-3 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-slate-500" />
        <span className="font-medium text-slate-300">{props.title || props.label || `${type} component`}</span>
      </div>
      <span className="text-[10px] text-slate-500 uppercase font-mono">{type}</span>
    </div>
  );
};
