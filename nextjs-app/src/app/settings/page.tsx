'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient } from '@/lib/api-client'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './SettingsPage.module.css'

type Tab = 'general' | 'team' | 'billing' | 'api'

const PLANS = [
  { id: 'starter', name: 'Starter', price: 'Free', current: true },
  { id: 'pro', name: 'Pro', price: '$29/mo', current: false },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', current: false },
]

export default function SettingsRoute() {
  return (
    <AuthGuard>
      <AppLayout>
        <SettingsContent />
      </AppLayout>
    </AuthGuard>
  )
}

function SettingsContent() {
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [workspaceName, setWorkspaceName] = useState('My Workspace')
  const [workspaceSlug, setWorkspaceSlug] = useState('my-workspace')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteSent, setInviteSent] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const mockApiKey = 'mk_live_' + 'x'.repeat(32)

  const handleSaveGeneral = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviteSent(true)
    setInviteEmail('')
    setTimeout(() => setInviteSent(false), 3000)
  }

  const handleLogout = async () => {
    try { await apiClient.post('/api/auth/logout') } catch {}
    useAuthStore.getState().clearAuth()
    window.location.href = '/'
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'team', label: 'Team' },
    { id: 'billing', label: 'Billing' },
    { id: 'api', label: 'API' },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your workspace, team, and billing.</p>
      </header>
      <div className={styles.layout}>
        <nav className={styles.tabNav}>
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
          ))}
          <div className={styles.tabNavSpacer} />
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </nav>

        <div className={styles.tabContent}>
          {activeTab === 'general' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Workspace</h2>
              <p className={styles.panelDesc}>Configure your workspace details.</p>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="ws-name">Workspace name</label>
                <input id="ws-name" type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="ws-slug">Workspace URL</label>
                <div className={styles.slugInput}>
                  <span className={styles.slugPrefix}>momentra.app/</span>
                  <input id="ws-slug" type="text" value={workspaceSlug} onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className={styles.input} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.saveBtn} onClick={handleSaveGeneral} disabled={saving}>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}</button>
              </div>
              <div className={styles.dangerZone}>
                <h3 className={styles.dangerTitle}>Danger zone</h3>
                <div className={styles.dangerCard}>
                  <div><p className={styles.dangerLabel}>Delete workspace</p><p className={styles.dangerDesc}>Permanently delete this workspace and all its data.</p></div>
                  <button type="button" className={styles.dangerBtn}>Delete workspace</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Team members</h2>
              <p className={styles.panelDesc}>Manage who has access to this workspace.</p>
              <div className={styles.inviteRow}>
                <input type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={styles.input} />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={styles.select}><option value="member">Member</option><option value="photographer">Photographer</option><option value="admin">Admin</option></select>
                <button type="button" className={styles.inviteBtn} onClick={handleInvite}>Invite</button>
              </div>
              {inviteSent && <p className={styles.inviteSuccess}>Invitation sent!</p>}
              <div className={styles.memberList}>
                <div className={styles.memberRow}>
                  <div className={styles.memberAvatar}>{user?.username?.charAt(0).toUpperCase() ?? 'U'}</div>
                  <div className={styles.memberInfo}><span className={styles.memberName}>{user?.username}</span><span className={styles.memberEmail}>{user?.email}</span></div>
                  <span className={styles.roleBadge}>admin</span>
                  <span className={styles.memberYou}>You</span>
                </div>
              </div>
              <div className={styles.inviteLinkBox}>
                <h3 className={styles.inviteLinkTitle}>Invite link</h3>
                <p className={styles.inviteLinkDesc}>Share this link to let people join your workspace.</p>
                <div className={styles.inviteLinkRow}><code className={styles.inviteLinkCode}>https://momentra.app/join/abc123</code><button type="button" className={styles.copyBtn}>Copy</button></div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Billing & Plan</h2>
              <p className={styles.panelDesc}>Manage your subscription and usage.</p>
              <div className={styles.currentPlan}>
                <div className={styles.currentPlanInfo}>
                  <span className={styles.currentPlanBadge}>Current plan</span>
                  <h3 className={styles.currentPlanName}>Starter (Free)</h3>
                  <p className={styles.currentPlanDesc}>5 events, 500 photos, 3 members</p>
                </div>
              </div>
              <h3 className={styles.usageTitle}>Usage this month</h3>
              <div className={styles.usageGrid}>
                <div className={styles.usageItem}><div className={styles.usageHeader}><span>Events</span><span>0 / 5</span></div><div className={styles.usageBar}><div className={styles.usageFill} style={{ width: '0%' }} /></div></div>
                <div className={styles.usageItem}><div className={styles.usageHeader}><span>Photos</span><span>0 / 500</span></div><div className={styles.usageBar}><div className={styles.usageFill} style={{ width: '0%' }} /></div></div>
                <div className={styles.usageItem}><div className={styles.usageHeader}><span>Team members</span><span>1 / 3</span></div><div className={styles.usageBar}><div className={styles.usageFill} style={{ width: '33%' }} /></div></div>
                <div className={styles.usageItem}><div className={styles.usageHeader}><span>Storage</span><span>0 MB / 5 GB</span></div><div className={styles.usageBar}><div className={styles.usageFill} style={{ width: '0%' }} /></div></div>
              </div>
              <h3 className={styles.plansTitle}>Available plans</h3>
              <div className={styles.plansGrid}>
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`${styles.planCard} ${plan.current ? styles.planCardCurrent : ''}`}>
                    <h4 className={styles.planCardName}>{plan.name}</h4>
                    <p className={styles.planCardPrice}>{plan.price}</p>
                    {plan.current ? <span className={styles.planCardBadge}>Current</span> : <button type="button" className={styles.planCardBtn}>{plan.id === 'enterprise' ? 'Contact sales' : 'Upgrade'}</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>API Access</h2>
              <p className={styles.panelDesc}>Integrate Momentra with your existing tools.</p>
              <div className={styles.apiSection}>
                <h3 className={styles.apiLabel}>API Key</h3>
                <div className={styles.apiKeyRow}>
                  <code className={styles.apiKeyCode}>{apiKeyVisible ? mockApiKey : 'mk_live_' + '•'.repeat(32)}</code>
                  <button type="button" className={styles.toggleBtn} onClick={() => setApiKeyVisible(!apiKeyVisible)}>{apiKeyVisible ? 'Hide' : 'Reveal'}</button>
                  <button type="button" className={styles.copyBtn}>Copy</button>
                </div>
                <p className={styles.apiHint}>Use this key to authenticate API requests. Keep it secret.</p>
              </div>
              <div className={styles.apiSection}>
                <h3 className={styles.apiLabel}>Webhook URL</h3>
                <input type="url" placeholder="https://your-app.com/webhooks/momentra" className={styles.input} />
                <p className={styles.apiHint}>We&apos;ll send POST requests here when events happen (uploads, comments, etc.).</p>
              </div>
              <div className={styles.apiDocs}>
                <h3 className={styles.apiLabel}>Documentation</h3>
                <p className={styles.apiDocsText}>Check out our API docs to learn how to upload photos, manage events, and query galleries programmatically.</p>
                <a href="#" className={styles.apiDocsLink}>View API documentation →</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
