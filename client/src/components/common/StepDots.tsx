interface StepDotsProps {
  total: number;
  current: number;
}

export default function StepDots({ total, current }: StepDotsProps) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array(total).fill(0).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i <= current ? 'w-8 bg-slate-900' : 'w-5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}
