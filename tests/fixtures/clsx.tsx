import clsx from 'clsx';
import React from 'react';

export const ClsxComponent = ({ active }: { active: boolean }) => {
  return <div className={clsx('p-4', active && 'h-[40px]')} />;
};
