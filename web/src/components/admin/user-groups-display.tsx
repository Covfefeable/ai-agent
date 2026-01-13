import { Popover } from 'antd';

interface UserGroupsDisplayProps {
  groups?: string;
}

export function UserGroupsDisplay({ groups }: UserGroupsDisplayProps) {
  if (!groups) {
    return <span className="text-slate-400">-</span>;
  }

  const groupList = groups.split(',');
  
  if (groupList.length <= 2) {
    return (
      <div className="flex flex-wrap gap-1">
        {groupList.map((group, idx) => (
          <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {group}
          </span>
        ))}
      </div>
    );
  }

  const firstTwo = groupList.slice(0, 2);
  const remaining = groupList.slice(2);

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {firstTwo.map((group, idx) => (
        <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {group}
        </span>
      ))}
      <Popover
        content={
          <div className="flex flex-wrap gap-1 max-w-[300px]">
            {remaining.map((group, idx) => (
              <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {group}
              </span>
            ))}
          </div>
        }
      >
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 cursor-default hover:bg-slate-200">
          +{remaining.length}
        </span>
      </Popover>
    </div>
  );
}
