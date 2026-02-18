// ESLint flat config for Next.js 15 with TypeScript
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [...coreWebVitals, ...typescript];

export default eslintConfig;
