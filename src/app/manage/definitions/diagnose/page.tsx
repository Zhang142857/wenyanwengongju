'use client'

import Layout from '@/components/Layout'
import DefinitionDiagnostic from '../diagnose'

export default function DiagnosePage() {
  return (
    <Layout title="义项库诊断" subtitle="Definition Library Diagnostic" fullWidth>
      <DefinitionDiagnostic />
    </Layout>
  )
}
