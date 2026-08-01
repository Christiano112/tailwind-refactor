import { cva } from 'class-variance-authority';
import clsx from 'clsx';
import React from 'react';

const buttonVariants = cva('rounded-[8px]');

export function Button({ active }: { active: boolean }) {
  return (
    <button className={clsx('h-[40px] p-[16px] text-[16px] bg-[#ffffff]', active && 'md:hover:!h-[40px]')}>
      Click
    </button>
  );
}
