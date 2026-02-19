import { formatCurrency } from '../../lib/utils';

const DonutChart = ({ data, total }) => {
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let currentAngle = -90;

  const labelsData = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const midAngle = currentAngle + angle / 2;
    currentAngle += angle;

    const rad = (midAngle * Math.PI) / 180;
    const labelRadius = radius + 35;
    const lineStart = radius + 12;
    const lineEnd = radius + 25;

    return {
      ...item,
      percentage,
      lineStartX: center + Math.cos(rad) * lineStart,
      lineStartY: center + Math.sin(rad) * lineStart,
      lineEndX: center + Math.cos(rad) * lineEnd,
      lineEndY: center + Math.sin(rad) * lineEnd,
      labelX: center + Math.cos(rad) * labelRadius,
      labelY: center + Math.sin(rad) * labelRadius,
      textAnchor: midAngle > -90 && midAngle < 90 ? 'start' : 'end'
    };
  });

  let currentOffset = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <g className="transform -rotate-90 origin-center" style={{ transformOrigin: `${center}px ${center}px` }}>
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            fill="transparent" 
            stroke="rgba(255,255,255,0.05)" 
            strokeWidth={strokeWidth} 
          />
          {data.map((item, i) => {
            const percentage = (item.value / total) * 100;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (percentage / 100) * circumference;
            return (
              <circle 
                key={i} 
                cx={center} 
                cy={center} 
                r={radius} 
                fill="transparent" 
                stroke={item.color} 
                strokeWidth={strokeWidth} 
                strokeDasharray={strokeDasharray} 
                strokeDashoffset={strokeDashoffset} 
                className="transition-all duration-500" 
              />
            );
          })}
        </g>
        {labelsData.filter(l => l.percentage >= 1).map((label, i) => (
          <g key={i}>
            <line 
              x1={label.lineStartX} 
              y1={label.lineStartY} 
              x2={label.lineEndX} 
              y2={label.lineEndY} 
              stroke={label.color} 
              strokeWidth="2" 
              strokeLinecap="round" 
            />
            <text 
              x={label.labelX} 
              y={label.labelY} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fill="var(--text-primary, #fff)" 
              fontSize="11" 
              fontWeight="bold"
            >
              {Math.round(label.percentage)}%
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-xs font-black text-gray-500 uppercase tracking-tighter">ยอดรวม</div>
        <div className="text-lg font-black text-white leading-none">{formatCurrency(total).replace('฿', '')}</div>
      </div>
    </div>
  );
};

export default DonutChart;
