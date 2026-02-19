import { Icons } from './Icons';

const TrendChart = ({ data, color = '#D4AF37' }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.value), 100);
  const width = 300;
  const height = 100;
  const padding = 20;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - ((d.value / max) * (height - 2 * padding) + padding);
    return { x, y };
  });
  
  const pathData = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';
  const areaData = pathData + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  
  return (
    <div className="w-full h-32 mt-4 glass rounded-3xl p-4 border border-white/5 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-black text-gold-primary uppercase tracking-widest">
          <Icons.TrendingUp size={14} /> ภาพรวมการใช้จ่าย
        </div>
        <div className="text-xs font-bold text-gray-500">30 วันล่าสุด</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full flex-1 overflow-visible">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaData} fill="url(#trendGradient)" className="trend-line" />
        <path d={pathData} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="trend-line" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" className="trend-dot" />
        ))}
      </svg>
    </div>
  );
};

export default TrendChart;
