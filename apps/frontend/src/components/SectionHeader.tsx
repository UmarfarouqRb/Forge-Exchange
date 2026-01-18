import React from 'react';

interface SectionHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold mb-4 text-primary-foreground bg-gradient-to-r from-[hsl(27,87%,61%)] to-[hsl(214,66%,54%)] bg-clip-text text-transparent">
      {title}
    </h2>
    {children}
  </div>
);

export default SectionHeader;
