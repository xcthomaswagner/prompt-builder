# Admin Panel & API Key Management Specification

## Overview

This specification defines the implementation of role-based access control (RBAC), hierarchical API key management, and usage/cost tracking for the Intelligent Prompt Builder application.

---

## 1. Role-Based Access Control (RBAC)

### 1.1 Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Organization creator (1 per org) | Full access, delete org, transfer ownership, manage billing |
| **Admin** | Elevated privileges (multiple) | Manage org API keys, view usage analytics, manage user roles (except Owner), configure org settings |
| **Member** | Default role | Use org API keys, manage personal API keys (if allowed), view own usage |

### 1.2 Data Model

```javascript
// Firestore: /organizations/{orgId}
{
  name: "Acme Corp",
  createdAt: Timestamp,
  createdBy: "userId",
  
  // Member management
  members: {
    "userId1": {
      role: "owner",
      email: "owner@acme.com",
      displayName: "Thomas Wagner",
      joinedAt: Timestamp,
      invitedBy: null
    },
    "userId2": {
      role: "admin",
      email: "admin@acme.com",
      displayName: "Sarah Chen",
      joinedAt: Timestamp,
      invitedBy: "userId1"
    },
    "userId3": {
      role: "member",
      email: "member@acme.com",
      displayName: "Mike Johnson",
      joinedAt: Timestamp,
      invitedBy: "userId2"
    }
  },
  
  // Organization settings
  settings: {
    allowUserKeys: true,        // Allow members to use personal API keys
    requireOrgKeys: false,      // Enterprise: force org keys only
    defaultProvider: "gemini",  // Default LLM provider for new users
    usageAlerts: {
      enabled: true,
      warnThreshold: 0.20,      // Warn at 20% remaining
      criticalThreshold: 0.10   // Critical at 10% remaining
    }
  }
}
```

### 1.3 Permission Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View org API keys | ✅ | ✅ | ❌ |
| Edit org API keys | ✅ | ✅ | ❌ |
| View org usage analytics | ✅ | ✅ | ❌ |
| View usage by user | ✅ | ✅ | ❌ |
| Manage user roles | ✅ | ✅ (not Owner) | ❌ |
| Configure org settings | ✅ | ✅ | ❌ |
| Delete organization | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Use org API keys | ✅ | ✅ | ✅ |
| Manage personal API keys | ✅ | ✅ | ✅ (if allowed) |
| View own usage | ✅ | ✅ | ✅ |

---

## 2. API Key Management

### 2.1 Hierarchical Key Resolution

**Priority Order:**
1. User-level key (if exists and `allowUserKeys` is true)
2. Organization-level key (if exists)
3. No key → Prompt user to configure

```javascript
// src/lib/apiKeyService.js

export async function resolveApiKey(userId, orgId, provider) {
  const orgDoc = await getDoc(doc(db, 'organizations', orgId));
  const orgData = orgDoc.data();
  const orgSettings = orgData.settings || {};
  
  // Enterprise mode: org keys only
  if (orgSettings.requireOrgKeys) {
    const orgKey = orgData.apiKeys?.[provider]?.key;
    return orgKey 
      ? { key: orgKey, source: 'org' } 
      : { key: null, source: null };
  }
  
  // Check user keys first (if allowed)
  if (orgSettings.allowUserKeys !== false) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userKey = userDoc.data()?.apiKeys?.[provider]?.key;
    if (userKey) {
      return { key: userKey, source: 'user' };
    }
  }
  
  // Fall back to org key
  const orgKey = orgData.apiKeys?.[provider]?.key;
  return orgKey 
    ? { key: orgKey, source: 'org' } 
    : { key: null, source: null };
}
```

### 2.2 API Key Data Model

```javascript
// Organization-level keys: /organizations/{orgId}
{
  apiKeys: {
    openai: {
      key: "sk-...",              // Encrypted
      addedAt: Timestamp,
      addedBy: "userId",
      lastTestedAt: Timestamp,
      testStatus: "valid",        // "valid" | "invalid" | "untested"
      creditBalance: null,        // Auto-fetched from API
      lastBalanceFetch: Timestamp
    },
    anthropic: {
      key: "sk-ant-...",
      addedAt: Timestamp,
      addedBy: "userId",
      lastTestedAt: Timestamp,
      testStatus: "valid",
      creditBalance: null,        // Auto-fetched from API
      lastBalanceFetch: Timestamp
    },
    gemini: {
      key: "AIza...",
      addedAt: Timestamp,
      addedBy: "userId",
      lastTestedAt: Timestamp,
      testStatus: "valid",
      creditBalance: 100.00,      // Manual entry (no API available)
      lastBalanceUpdate: Timestamp,
      lastBalanceUpdatedBy: "userId"
    }
  }
}

// User-level keys: /users/{userId}
{
  apiKeys: {
    openai: {
      key: "sk-...",
      addedAt: Timestamp,
      lastTestedAt: Timestamp,
      testStatus: "valid"
    }
    // ... other providers
  },
  preferences: {
    preferPersonalKeys: true     // User preference when both exist
  }
}
```

### 2.3 Key Testing

Each provider requires a lightweight API call to validate the key:

```javascript
// src/lib/keyTester.js

export async function testApiKey(provider, apiKey) {
  try {
    switch (provider) {
      case 'openai':
        // Minimal API call - list models
        const openaiRes = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return { valid: openaiRes.ok, error: openaiRes.ok ? null : 'Invalid API key' };
        
      case 'anthropic':
        // Minimal API call - small completion
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2024-01-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        return { valid: anthropicRes.ok, error: anthropicRes.ok ? null : 'Invalid API key' };
        
      case 'gemini':
        // Minimal API call - list models
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );
        return { valid: geminiRes.ok, error: geminiRes.ok ? null : 'Invalid API key' };
        
      default:
        return { valid: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

---

## 3. Usage & Cost Tracking

### 3.1 Automatic Balance Fetching

| Provider | Balance API | Usage API | Method |
|----------|-------------|-----------|--------|
| **OpenAI** | ✅ `/v1/dashboard/billing/credit_grants` | ✅ `/v1/usage` | Auto-fetch |
| **Anthropic** | ⚠️ Rate limit headers | ✅ `/v1/usage` (beta) | Auto-fetch |
| **Gemini (AI Studio)** | ❌ None | ✅ Response metadata | Manual balance + auto usage |
| **Gemini (Vertex AI)** | ✅ Cloud Billing API | ✅ Cloud Billing API | Auto-fetch |

```javascript
// src/lib/billingService.js

export async function fetchProviderBalance(provider, apiKey) {
  switch (provider) {
    case 'openai':
      const res = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        totalCredit: data.total_granted,
        used: data.total_used,
        remaining: data.total_available,
        source: 'api',
        fetchedAt: new Date()
      };
      
    case 'anthropic':
      // Anthropic provides rate limits in response headers
      // Balance must be tracked from usage
      const usageRes = await fetch('https://api.anthropic.com/v1/usage', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2024-01-01'
        }
      });
      if (!usageRes.ok) return null;
      const usageData = await usageRes.json();
      return {
        tokensUsed: usageData.tokens_used,
        source: 'api',
        fetchedAt: new Date()
      };
      
    case 'gemini':
      // No balance API for AI Studio - return null to indicate manual entry required
      return null;
      
    default:
      return null;
  }
}
```

### 3.2 Usage Logging

Every API call logs usage for tracking:

```javascript
// Firestore: /organizations/{orgId}/usageLog/{logId}
{
  timestamp: Timestamp,
  userId: "userId",
  userEmail: "user@acme.com",
  provider: "openai",
  model: "gpt-4o",
  inputTokens: 1500,
  outputTokens: 800,
  keySource: "org",              // "org" | "personal"
  feature: "prompt_generation",  // "prompt_generation" | "experiment" | "reverse_prompt" | "quality_assessment"
  estimatedCost: 0.0125,         // Calculated from pricing table
  promptId: "promptId"           // Reference to the prompt that triggered this
}
```

### 3.3 Monthly Aggregation

Rolled up for performance:

```javascript
// Firestore: /organizations/{orgId}/usageMonthly/{YYYY-MM}
{
  month: "2024-12",
  
  byProvider: {
    openai: {
      totalRequests: 523,
      totalInputTokens: 2450000,
      totalOutputTokens: 890000,
      estimatedCost: 45.20,
      byModel: {
        "gpt-4o": {
          requests: 234,
          inputTokens: 1200000,
          outputTokens: 450000,
          estimatedCost: 32.50
        },
        "gpt-4o-mini": {
          requests: 289,
          inputTokens: 1250000,
          outputTokens: 440000,
          estimatedCost: 12.70
        }
      }
    },
    anthropic: { /* ... */ },
    gemini: { /* ... */ }
  },
  
  byKeySource: {
    org: {
      requests: 450,
      estimatedCost: 38.50
    },
    personal: {
      requests: 73,
      estimatedCost: 6.70
    }
  },
  
  byUser: {
    "userId1": {
      email: "thomas@acme.com",
      requests: 234,
      estimatedCost: 22.40,
      keySource: "org"
    },
    "userId2": {
      email: "sarah@acme.com",
      requests: 156,
      estimatedCost: 15.30,
      keySource: "org"
    }
  },
  
  byFeature: {
    prompt_generation: { requests: 320, estimatedCost: 28.00 },
    experiment: { requests: 150, estimatedCost: 14.50 },
    reverse_prompt: { requests: 45, estimatedCost: 2.20 },
    quality_assessment: { requests: 8, estimatedCost: 0.50 }
  }
}
```

### 3.4 Pricing Reference

```javascript
// src/lib/pricing.js

export const MODEL_PRICING = {
  // OpenAI (per 1M tokens) - as of Dec 2024
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  
  // Anthropic (per 1M tokens)
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  
  // Google Gemini (per 1M tokens)
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash-exp': { input: 0.10, output: 0.40 },
};

export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 10000) / 10000; // 4 decimal places
}
```

---

## 4. Admin Panel UI

### 4.1 Navigation

Add "Admin" link to settings menu (visible only to Owner/Admin roles):

```
Settings (existing)
├── API Keys (personal)
├── Preferences
└── Admin Panel ← NEW (Owner/Admin only)
    ├── Organization Settings
    ├── API Keys (org-level)
    ├── Users & Roles
    └── Usage Analytics
```

### 4.2 Admin Panel Sections

#### 4.2.1 Organization Settings

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Organization Settings                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Organization Name                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Acme Corp                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  API Key Policy                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Allow personal API keys (members can use own keys) │   │
│  │ ● Organization keys only (enterprise mode)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Default LLM Provider                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Gemini ▼                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Usage Alerts                                               │
│  [✓] Enable low credit alerts                               │
│      Warn at [20]% remaining                                │
│      Critical at [10]% remaining                            │
│                                                             │
│                                        [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2.2 Organization API Keys

```
┌─────────────────────────────────────────────────────────────┐
│  🔑 Organization API Keys                  [↻ Refresh All]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OpenAI                                           Status    │
│  ┌─────────────────────────────────────────────┐           │
│  │ sk-proj-****************************1234    │  ✅ Valid  │
│  └─────────────────────────────────────────────┘           │
│  Credit: $37.55 remaining of $50.00 (Auto)                  │
│  Last checked: 2 minutes ago                                │
│                                    [Test Key] [Remove]      │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Anthropic                                        Status    │
│  ┌─────────────────────────────────────────────┐           │
│  │ sk-ant-****************************5678    │  ✅ Valid  │
│  └─────────────────────────────────────────────┘           │
│  Credit: $6.80 remaining (Auto) ⚠️ Low balance              │
│  Last checked: 2 minutes ago                                │
│                                    [Test Key] [Remove]      │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Gemini                                           Status    │
│  ┌─────────────────────────────────────────────┐           │
│  │ AIza************************************9012│  ✅ Valid  │
│  └─────────────────────────────────────────────┘           │
│  Credit: $91.70 remaining of $100.00 (Manual)               │
│  Last updated: Dec 2, 2024 by thomas@acme.com               │
│                         [Update Balance] [Test Key] [Remove]│
│                                                             │
│  ─────────────────────────────────────────────────────      │
│  + Add API Key                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2.3 Users & Roles

```
┌─────────────────────────────────────────────────────────────┐
│  👥 Users & Roles                          [+ Invite User]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User                      Role        Joined      Actions  │
│  ───────────────────────────────────────────────────────    │
│  thomas@acme.com           Owner       Nov 1, 2024   —      │
│  sarah@acme.com            Admin ▼     Nov 5, 2024  [...]   │
│  mike@acme.com             Member ▼    Nov 12, 2024 [...]   │
│  jane@acme.com             Member ▼    Nov 20, 2024 [...]   │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  Pending Invitations                                        │
│  ───────────────────────────────────────────────────────    │
│  newuser@acme.com          Member      Sent Nov 28  [Resend]│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2.4 Usage Analytics

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Usage Analytics                        [December 2024 ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Credit Overview                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Provider     Credit    Used      Remaining  Status  │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ OpenAI       $50.00    $12.45    $37.55     🟢      │   │
│  │ Anthropic    $75.00    $68.20    $6.80      🟡      │   │
│  │ Gemini       $100.00   $8.30     $91.70     🟢      │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ Total        $225.00   $88.95    $136.05            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Usage by Model                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Model                Requests  Tokens (I/O)   Cost  │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ gpt-4o               89        1.2M/450K      $6.75 │   │
│  │ gpt-4o-mini          156       2.1M/890K      $0.85 │   │
│  │ claude-3-5-sonnet    67        890K/320K      $7.47 │   │
│  │ gemini-1.5-pro       124       1.8M/620K      $5.35 │   │
│  │ gemini-2.0-flash     203       3.2M/1.1M      $0.76 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Usage by User                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ User               Requests  Est. Cost  Key Source  │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ thomas@acme.com    234       $45.20     Org         │   │
│  │ sarah@acme.com     156       $28.40     Org         │   │
│  │ mike@acme.com      89        $12.35     Personal    │   │
│  │ jane@acme.com      45        $3.00      Org         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Usage by Feature                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████░░░░░░░░ Prompt Generation 62%  │   │
│  │ ████████░░░░░░░░░░░░░░░░░░░░ Experiments 28%        │   │
│  │ ██░░░░░░░░░░░░░░░░░░░░░░░░░░ Reverse Prompt 8%      │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Quality Assessment 2%  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                            [Export CSV]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Phases

### Phase 1: Foundation (MVP)
**Estimated: 3-4 hours**

- [ ] Add `role` field to user-org membership
- [ ] Create `src/lib/roleService.js` with permission checks
- [ ] Add Admin Panel route (`/admin`) with role guard
- [ ] Basic Organization Settings UI
- [ ] Org API key management with "Test Key" button
- [ ] User list with role dropdown

**Files to create/modify:**
- `src/lib/roleService.js` (new)
- `src/components/AdminPanel/index.jsx` (new)
- `src/components/AdminPanel/OrgSettings.jsx` (new)
- `src/components/AdminPanel/OrgApiKeys.jsx` (new)
- `src/components/AdminPanel/UserRoles.jsx` (new)
- `src/App.jsx` (add route)

### Phase 2: Personal Keys & Resolution
**Estimated: 2-3 hours**

- [ ] Create `src/lib/apiKeyService.js` with resolution logic
- [ ] Add personal API key storage to user document
- [ ] Update Settings panel for personal keys
- [ ] Add "Test Key" for personal keys
- [ ] Implement key resolution in all LLM calls

**Files to create/modify:**
- `src/lib/apiKeyService.js` (new)
- `src/lib/keyTester.js` (new)
- `src/components/Settings/PersonalApiKeys.jsx` (new or modify existing)

### Phase 3: Usage Tracking
**Estimated: 3-4 hours**

- [ ] Create `src/lib/usageTracker.js`
- [ ] Add usage logging to all LLM API calls
- [ ] Create Firestore indexes for usage queries
- [ ] Implement monthly aggregation (Cloud Function or client-side)

**Files to create/modify:**
- `src/lib/usageTracker.js` (new)
- `src/lib/pricing.js` (new)
- Modify all LLM call sites to log usage

### Phase 4: Balance Fetching & Analytics Dashboard
**Estimated: 3-4 hours**

- [ ] Create `src/lib/billingService.js`
- [ ] Implement OpenAI balance API
- [ ] Implement Anthropic usage API
- [ ] Manual balance entry for Gemini
- [ ] Usage Analytics dashboard UI
- [ ] CSV export functionality

**Files to create/modify:**
- `src/lib/billingService.js` (new)
- `src/components/AdminPanel/UsageAnalytics.jsx` (new)

### Phase 5: Alerts & Polish
**Estimated: 2 hours**

- [ ] Low credit alerts (in-app notification)
- [ ] Email alerts (optional, requires email service)
- [ ] Usage trend charts
- [ ] Mobile-responsive admin panel

---

## 6. Security Considerations

### 6.1 Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Organization access
    match /organizations/{orgId} {
      // Read: any member
      allow read: if isOrgMember(orgId);
      
      // Write settings/apiKeys: owner or admin only
      allow update: if isOrgAdmin(orgId) && 
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['members', 'createdAt', 'createdBy']);
      
      // Member management: owner or admin (admin can't modify owner)
      allow update: if isOrgAdmin(orgId) && 
        !isModifyingOwner(resource, request);
      
      // Delete: owner only
      allow delete: if isOrgOwner(orgId);
      
      // Usage logs subcollection
      match /usageLog/{logId} {
        allow read: if isOrgAdmin(orgId);
        allow create: if isOrgMember(orgId);
      }
      
      // Monthly aggregates
      match /usageMonthly/{monthId} {
        allow read: if isOrgAdmin(orgId);
        allow write: if false; // Server-side only
      }
    }
    
    // User personal data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Helper functions
    function isOrgMember(orgId) {
      return request.auth.uid in 
        get(/databases/$(database)/documents/organizations/$(orgId)).data.members;
    }
    
    function isOrgAdmin(orgId) {
      let org = get(/databases/$(database)/documents/organizations/$(orgId)).data;
      let role = org.members[request.auth.uid].role;
      return role == 'owner' || role == 'admin';
    }
    
    function isOrgOwner(orgId) {
      let org = get(/databases/$(database)/documents/organizations/$(orgId)).data;
      return org.members[request.auth.uid].role == 'owner';
    }
  }
}
```

### 6.2 API Key Security

- Keys stored encrypted in Firestore (consider Firebase Extensions for encryption)
- Keys never returned to client after initial save (masked display only)
- Test endpoints use minimal API calls to avoid cost
- Rate limit key testing to prevent abuse

---

## 7. Migration Plan

### 7.1 Existing Users

For existing organizations without role data:

```javascript
// Migration script
async function migrateExistingOrgs() {
  const orgsSnapshot = await getDocs(collection(db, 'organizations'));
  
  for (const orgDoc of orgsSnapshot.docs) {
    const orgData = orgDoc.data();
    
    // Skip if already migrated
    if (orgData.members) continue;
    
    // Set creator as owner
    await updateDoc(orgDoc.ref, {
      members: {
        [orgData.createdBy]: {
          role: 'owner',
          joinedAt: orgData.createdAt,
          invitedBy: null
        }
      },
      settings: {
        allowUserKeys: true,
        requireOrgKeys: false,
        defaultProvider: 'gemini',
        usageAlerts: {
          enabled: true,
          warnThreshold: 0.20,
          criticalThreshold: 0.10
        }
      }
    });
  }
}
```

---

## 8. Testing Checklist

### 8.1 Role-Based Access

- [ ] Owner can access all admin features
- [ ] Admin can access admin features except delete org
- [ ] Member cannot access admin panel
- [ ] Role changes take effect immediately
- [ ] Cannot demote the only owner

### 8.2 API Key Management

- [ ] Org keys work for all members
- [ ] Personal keys work when allowed
- [ ] Personal keys blocked when `requireOrgKeys` is true
- [ ] Key testing validates correctly
- [ ] Invalid keys show error state

### 8.3 Usage Tracking

- [ ] All LLM calls are logged
- [ ] Token counts are accurate
- [ ] Cost calculations match pricing table
- [ ] Monthly aggregation is correct
- [ ] CSV export contains all data

### 8.4 Balance Fetching

- [ ] OpenAI balance fetches automatically
- [ ] Anthropic usage fetches automatically
- [ ] Gemini manual entry works
- [ ] Low balance alerts trigger correctly

---

## 9. Future Enhancements

- **Billing integration**: Connect to Stripe for paid tiers
- **Usage quotas**: Set per-user or per-role limits
- **Audit log**: Track all admin actions
- **SSO/SAML**: Enterprise authentication
- **API access**: REST API for programmatic usage
- **Webhooks**: Notify external systems of usage events
