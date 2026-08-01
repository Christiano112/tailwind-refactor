import React from 'react';

export const DynamicTemplateComponent = ({ height }: { height: number }) => {
  return <div className={`p-4 h-[${height}px]`} />;
};
