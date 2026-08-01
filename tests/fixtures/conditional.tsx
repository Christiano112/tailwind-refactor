import React from 'react';

export const ConditionalComponent = ({ active }: { active: boolean }) => {
  return <div className={`p-4 ${active ? 'h-[40px]' : 'h-[20px]'}`} />;
};
