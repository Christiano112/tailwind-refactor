import { cva } from 'class-variance-authority';

export const buttonVariants = cva('rounded-[8px] p-4', {
  variants: {
    intent: {
      primary: 'bg-[#0000ff]',
    },
  },
});
