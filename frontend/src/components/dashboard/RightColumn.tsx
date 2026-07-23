import React from 'react';
import EnlilWidget from './widgets/EnlilWidget';
import NewsWidget from './widgets/NewsWidget';
import BlogWidget from './widgets/BlogWidget';
import AlertsWidget from './widgets/AlertsWidget';

export default function RightColumn() {
  return (
    <div style={{ flex: '1 1 30%', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
      <EnlilWidget />
      <NewsWidget />
      <BlogWidget />
      <AlertsWidget />
    </div>
  );
}
