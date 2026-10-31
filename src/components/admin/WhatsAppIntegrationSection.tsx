import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Smartphone, 
  Power, 
  RefreshCw, 
  Calendar, 
  ShieldAlert,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  Building2,
  Plus,
  MapPin,
  Phone,
  UserCheck,
  ExternalLink,
  QrCode,
  Radio,
  Send,
  MessageCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { 
  SalonBranch,
  BranchWhatsAppIntegration, 
  WhatsAppPublicConfig,
  User,
  WhatsAppMessageLog
} from '../../types/salon';

type MetaSdk = {
  init: (options: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  login: (callback: (response: any) => void, options: Record<string, any>) => void;
};

type MetaSdkWindow = Window & {
  FB?: MetaSdk;
  fbAsyncInit?: () => void;
  __glossyLooksMetaSdkPromise?: Promise<MetaSdk>;
};

const META_SDK_SCRIPT_ID = 'glossy-looks-meta-jssdk';

/**
 * Loads Meta's browser SDK exactly once. The old implementation called FB.login
 * without ever adding Meta's SDK script, so the pairing button could only show
 * the "SDK is loading" message. Keeping this loader local means the App ID
 * continues to come from the server's public configuration, not the client bundle.
 */
const loadMetaSdk = (appId: string): Promise<MetaSdk> => {
  const metaWindow = window as MetaSdkWindow;

  if (metaWindow.FB) {
    return Promise.resolve(metaWindow.FB);
  }

  if (metaWindow.__glossyLooksMetaSdkPromise) {
    return metaWindow.__glossyLooksMetaSdkPromise;
  }

  metaWindow.__glossyLooksMetaSdkPromise = new Promise<MetaSdk>((resolve, reject) => {
    let settled = false;
    let timeoutId: number | undefined;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      delete metaWindow.__glossyLooksMetaSdkPromise;
      reject(new Error(message));
    };

    const initialise = () => {
      if (settled) return;
      if (!metaWindow.FB) {
        fail('Meta JavaScript SDK did not become available.');
        return;
      }
      try {
        metaWindow.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: 'v23.0'
        });
        settled = true;
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        resolve(metaWindow.FB);
      } catch {
        fail('Meta JavaScript SDK could not be initialized for this App ID.');
      }
    };

    metaWindow.fbAsyncInit = initialise;
    const existingScript = document.getElementById(META_SDK_SCRIPT_ID) as HTMLScriptElement | null;

    timeoutId = window.setTimeout(() => {
      if (!metaWindow.FB) {
        fail('Meta JavaScript SDK took too long to load. Check the internet connection or browser privacy extensions.');
      }
    }, 15000);

    if (existingScript) {
      if (metaWindow.FB) {
        initialise();
        return;
      }
      existingScript.addEventListener('load', initialise, { once: true });
      existingScript.addEventListener('error', () => fail('Meta JavaScript SDK was blocked by the browser or a privacy extension.'), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = META_SDK_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onload = initialise;
    script.onerror = () => fail('Meta JavaScript SDK was blocked by the browser or a privacy extension.');
    document.head.appendChild(script);
  });

  return metaWindow.__glossyLooksMetaSdkPromise;
};

interface WhatsAppIntegrationSectionProps {
  currentUserName: string;
  currentUserId?: string;
  isOwner: boolean;
  isManager?: boolean;
  assignedBranchId?: string;
}

interface DiagnosticState {
  finishEvent: 'pending' | 'success' | 'failed';
  oauthCode: 'pending' | 'success' | 'failed';
  wabaReceived: 'pending' | 'success' | 'failed';
  phoneReceived: 'pending' | 'success' | 'failed';
  graphVerified: 'pending' | 'success' | 'failed';
  summary?: string;
}

interface MetaPhoneCandidate {
  waba_id: string;
  phone_number_id: string;
  display_phone_number?: string;
  verified_name?: string;
}

export const WhatsAppIntegrationSection: React.FC<WhatsAppIntegrationSectionProps> = ({
  currentUserName,
  currentUserId,
  isOwner,
  isManager = false,
  assignedBranchId
}) => {
  // Branches list & current active branch
  const [branches, setBranches] = useState<SalonBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<SalonBranch | null>(null);
  const [integration, setIntegration] = useState<BranchWhatsAppIntegration | null>(null);
  const [config, setConfig] = useState<WhatsAppPublicConfig | null>(null);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);

  // Async action flags
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [phoneCandidates, setPhoneCandidates] = useState<MetaPhoneCandidate[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Diagnostic state
  const [diagnostics, setDiagnostics] = useState<DiagnosticState>({
    finishEvent: 'pending',
    oauthCode: 'pending',
    wabaReceived: 'pending',
    phoneReceived: 'pending',
    graphVerified: 'pending',
    summary: ''
  });

  // Edit branch form state
  const [editBranchNumber, setEditBranchNumber] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchCity, setEditBranchCity] = useState('');
  const [editBranchPhone, setEditBranchPhone] = useState('');
  const [editBranchManagerId, setEditBranchManagerId] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);

  // New branch form state
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('Hyderabad, Telangana');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchWhatsAppNumber, setNewBranchWhatsAppNumber] = useState('');
  const [newBranchManagerId, setNewBranchManagerId] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  // Template Test & Webhook Simulation State (Owner only)
  const [testRecipient, setTestRecipient] = useState('');
  const [testTemplate, setTestTemplate] = useState('gl_appointment_confirmation');
  const [sendingTestTemplate, setSendingTestTemplate] = useState(false);
  const [testSendResult, setTestSendResult] = useState<any>(null);
  const [simulatingFeedback, setSimulatingFeedback] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [branchLogs, setBranchLogs] = useState<WhatsAppMessageLog[]>([]);
  const [loadingBranchLogs, setLoadingBranchLogs] = useState(false);

  // References for Meta listeners and timeouts
  const latestCapturedMetaIds = useRef<{ waba_id: string; phone_number_id: string } | null>(null);
  const latestAuthCode = useRef<string | null>(null);
  const activeMessageListener = useRef<((event: MessageEvent) => void) | null>(null);
  const signupTimeout = useRef<number | null>(null);

  // Role validation: only Owner and Branch Manager have access
  const isAuthorized = isOwner || isManager;

  // 1. Load branches & status
  const loadBranchesAndStatus = async (preferredBranchId?: string) => {
    try {
      setLoading(true);
      setErrorMessage('');

      // Fetch branches according to role
      const branchList = await api.getBranches();
      setBranches(branchList);

      if (isOwner) {
        api.getAdminUsers().then(users => setAdminUsers(users)).catch(() => {});
      }

      if (branchList.length === 0) {
        setSelectedBranch(null);
        setIntegration(null);
        setLoading(false);
        return;
      }

      // Determine active branch
      let targetBranch: SalonBranch | undefined;
      if (preferredBranchId) {
        targetBranch = branchList.find(b => b.id === preferredBranchId);
      } else if (!isOwner && assignedBranchId) {
        targetBranch = branchList.find(b => b.id === assignedBranchId) || branchList[0];
      } else if (selectedBranchId) {
        targetBranch = branchList.find(b => b.id === selectedBranchId) || branchList[0];
      } else {
        targetBranch = branchList[0];
      }

      if (targetBranch) {
        setSelectedBranchId(targetBranch.id);
        setSelectedBranch(targetBranch);
        await loadBranchWhatsApp(targetBranch.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const loadBranchWhatsApp = async (branchId: string) => {
    try {
      const data = await api.getBranchWhatsAppStatus(branchId);
      setSelectedBranch(data.branch);
      setIntegration(data.integration);
      setConfig(data.config);

      // Populate edit fields
      setEditBranchName(data.branch.name);
      setEditBranchNumber(data.branch.whatsapp_number);
      setEditBranchAddress(data.branch.address);
      setEditBranchCity(data.branch.city);
      setEditBranchPhone(data.branch.phone);
      setEditBranchManagerId(data.branch.manager_id || '');

      if (data.integration.diagnostics) {
        setDiagnostics({
          finishEvent: 'success',
          oauthCode: data.integration.diagnostics.includes('OAuth code received') ? 'success' : 'pending',
          wabaReceived: Boolean(data.integration.waba_id) ? 'success' : 'failed',
          phoneReceived: Boolean(data.integration.phone_number_id) ? 'success' : 'failed',
          graphVerified: data.integration.status === 'connected' ? 'success' : 'failed',
          summary: data.integration.diagnostics
        });
      } else {
        setDiagnostics({
          finishEvent: 'pending',
          oauthCode: 'pending',
          wabaReceived: Boolean(data.integration.waba_id) ? 'success' : 'pending',
          phoneReceived: Boolean(data.integration.phone_number_id) ? 'success' : 'pending',
          graphVerified: data.integration.status === 'connected' ? 'success' : 'pending',
          summary: data.integration.status === 'connected' ? 'Connected and verified' : 'Disconnected'
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to load WhatsApp status for branch.`);
    }
  };

  const loadBranchLogs = async (branchId: string) => {
    try {
      setLoadingBranchLogs(true);
      const logs = await api.getWhatsAppMessageLogs(undefined, branchId);
      setBranchLogs(logs || []);
    } catch {
      // safe ignore
    } finally {
      setLoadingBranchLogs(false);
    }
  };

  const handleSendTestTemplate = async () => {
    if (!selectedBranch) return;
    const phone = testRecipient.trim() || selectedBranch.phone || selectedBranch.whatsapp_number;
    setSendingTestTemplate(true);
    setTestSendResult(null);
    try {
      const res = await api.sendWhatsAppTestTemplate({
        branch_id: selectedBranch.id,
        recipient: phone,
        template_name: testTemplate
      });
      setTestSendResult(res);
      await loadBranchLogs(selectedBranch.id);
    } catch (err: any) {
      setTestSendResult({
        success: false,
        error: err.message || 'Test send failed'
      });
    } finally {
      setSendingTestTemplate(false);
    }
  };

  const handleSimulateFeedback = async (rating: 'good' | 'average' | 'bad') => {
    if (!selectedBranch) return;
    const phone = testRecipient.trim() || selectedBranch.phone || '9154744608';
    setSimulatingFeedback(true);
    setSimulationResult(null);
    try {
      const res = await api.simulateWhatsAppFeedbackReply({
        phone,
        rating,
        text: rating === 'good' ? 'Great haircut & makeup! Very polite staff.' : rating === 'average' ? 'Wait time was a bit longer than expected.' : 'Service was not as described.'
      });
      setSimulationResult(res);
    } catch (err: any) {
      setSimulationResult({
        success: false,
        message: err.message
      });
    } finally {
      setSimulatingFeedback(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadBranchesAndStatus();
    }
    return () => {
      if (activeMessageListener.current) {
        window.removeEventListener('message', activeMessageListener.current);
      }
      if (signupTimeout.current !== null) {
        window.clearTimeout(signupTimeout.current);
      }
    };
  }, [isAuthorized]);

  const handleSelectBranch = async (branchId: string) => {
    if (branchId === selectedBranchId) return;
    setErrorMessage('');
    setSuccessMessage('');
    setSelectedBranchId(branchId);
    const br = branches.find(b => b.id === branchId);
    if (br) setSelectedBranch(br);
    await loadBranchWhatsApp(branchId);
  };

  // 2. Submit connection credentials to server
  const submitConnection = (data: { wabaId?: string; phoneNumberId?: string; code?: string }) => {
    if (!selectedBranchId) return;
    setConnecting(true);
    setErrorMessage('');
    setSuccessMessage('');

    api.connectBranchWhatsApp(selectedBranchId, {
      waba_id: data.wabaId,
      phone_number_id: data.phoneNumberId,
      code: data.code,
      display_name: selectedBranch?.name || 'The Glossy Looks Salon',
      display_phone_number: selectedBranch?.whatsapp_number || ''
    }, currentUserName)
      .then(res => {
        if (res.selection_required && res.candidates?.length) {
          setPhoneCandidates(res.candidates);
          setErrorMessage(res.message || 'Multiple numbers found. Please select this branch’s phone number.');
          return;
        }

        if (!res.integration) {
          throw new Error(res.message || 'Meta verification failed. Phone number does not belong to the returned WABA.');
        }

        setIntegration(res.integration);
        setPhoneCandidates([]);
        const diagSummary = res.diagnostics || 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.';
        setDiagnostics({
          finishEvent: 'success',
          oauthCode: data.code ? 'success' : 'pending',
          wabaReceived: 'success',
          phoneReceived: 'success',
          graphVerified: 'success',
          summary: diagSummary
        });
        setSuccessMessage(`WhatsApp Business Coexistence connected and verified with Meta Graph API for ${selectedBranch?.name}!`);
      })
      .catch(err => {
        setIntegration(prev => prev ? { ...prev, status: 'failed', error_message: err.message } : null);
        setDiagnostics(prev => ({
          ...prev,
          oauthCode: data.code ? 'success' : prev.oauthCode,
          wabaReceived: data.wabaId ? 'success' : prev.wabaReceived,
          phoneReceived: data.phoneNumberId ? 'success' : prev.phoneReceived,
          graphVerified: 'failed',
          summary: err.message || 'Meta could not verify the WhatsApp account.'
        }));
        setErrorMessage(err.message || 'Connection incomplete — Meta IDs were not received or failed Graph verification.');
      })
      .finally(() => {
        setConnecting(false);
      });
  };

  // 3. Launch official Meta Embedded Signup for Coexistence
  const handleGenerateMetaPairingQR = async () => {
    if (!selectedBranchId || !selectedBranch) return;
    setErrorMessage('');
    setSuccessMessage('');
    latestCapturedMetaIds.current = null;
    latestAuthCode.current = null;

    if (!config?.meta_app_id || !config?.config_id) {
      setErrorMessage('Meta App ID or Embedded Signup Config ID is not configured on the server.');
      return;
    }
    try {
      // Load and initialise the official Meta SDK before calling FB.login.
      // This is deliberately awaited so the first button click works too.
      await loadMetaSdk(config.meta_app_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Meta JavaScript SDK could not be loaded. Check browser privacy extensions and retry.');
      return;
    }

    if (signupTimeout.current !== null) window.clearTimeout(signupTimeout.current);

    // Notify backend that pairing flow has begun
    try {
      await api.startBranchWhatsAppPairing(selectedBranchId, currentUserName);
      setIntegration(prev => prev ? { ...prev, status: 'pairing' } : null);
    } catch {
      // Non-blocking
    }

    setDiagnostics({
      finishEvent: 'pending',
      oauthCode: 'pending',
      wabaReceived: 'pending',
      phoneReceived: 'pending',
      graphVerified: 'pending',
      summary: 'Opening official Meta Embedded Signup popup. Scan the QR code or enter access code in WhatsApp Business app...'
    });
    setConnecting(true);

    if (activeMessageListener.current) {
      window.removeEventListener('message', activeMessageListener.current);
    }

    let finishEventReceived = false;
    let connectionSubmitted = false;

    const clearMessageListener = () => {
      if (activeMessageListener.current) {
        window.removeEventListener('message', activeMessageListener.current);
        activeMessageListener.current = null;
      }
      if (signupTimeout.current !== null) {
        window.clearTimeout(signupTimeout.current);
        signupTimeout.current = null;
      }
    };

    const extractIds = (source: any) => {
      const raw = typeof source === 'string'
        ? (() => { try { return JSON.parse(source); } catch { return {}; } })()
        : source || {};
      const candidates = [
        raw, 
        raw.data, 
        raw.authResponse, 
        raw.authResponse?.data, 
        raw.sessionInfo, 
        raw.authResponse?.sessionInfo,
        raw.data?.data
      ];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        const wabaId = String(candidate.waba_id || candidate.wabaId || candidate.waba_account_id || '').trim();
        const phoneNumberId = String(candidate.phone_number_id || candidate.phoneNumberId || candidate.phone_id || '').trim();
        if (wabaId || phoneNumberId) return { wabaId, phoneNumberId };
      }
      return { wabaId: '', phoneNumberId: '' };
    };

    const submitAvailableCredentials = () => {
      if (connectionSubmitted) return;
      const ids = latestCapturedMetaIds.current;
      const code = latestAuthCode.current;
      if (!(ids?.waba_id && ids?.phone_number_id) && !code) return;

      connectionSubmitted = true;
      clearMessageListener();
      submitConnection({
        wabaId: ids?.waba_id,
        phoneNumberId: ids?.phone_number_id,
        code: code || undefined
      });
    };

    const scheduleIncompleteError = () => {
      if (signupTimeout.current !== null) window.clearTimeout(signupTimeout.current);
      signupTimeout.current = window.setTimeout(() => {
        if (connectionSubmitted) return;
        setConnecting(false);
        setDiagnostics(prev => ({
          ...prev,
          finishEvent: finishEventReceived ? 'success' : 'failed',
          oauthCode: latestAuthCode.current ? 'success' : 'failed',
          wabaReceived: latestCapturedMetaIds.current?.waba_id ? 'success' : 'failed',
          phoneReceived: latestCapturedMetaIds.current?.phone_number_id ? 'success' : 'failed',
          graphVerified: 'failed',
          summary: 'Connection incomplete — Meta IDs were not received. Please scan the QR code in WhatsApp Business and complete pairing.'
        }));
        setErrorMessage('Connection incomplete — Meta IDs were not received. Please retry the pairing flow.');
        clearMessageListener();
      }, 10000);
    };

    // Register window.message listener BEFORE opening Meta Embedded Signup
    const messageHandler = (event: MessageEvent) => {
      const trustedOrigins = new Set([
        'https://www.facebook.com',
        'https://web.facebook.com',
        'https://business.facebook.com'
      ]);
      if (!trustedOrigins.has(event.origin)) return;

      let payload: any = event.data;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (!payload || typeof payload !== 'object' || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

      // Handle both Meta completion events
      if (payload.event === 'FINISH' || payload.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        finishEventReceived = true;
        const { wabaId, phoneNumberId } = extractIds(payload);
        if (wabaId && phoneNumberId) {
          latestCapturedMetaIds.current = { waba_id: wabaId, phone_number_id: phoneNumberId };
        }
        setDiagnostics(prev => ({
          ...prev,
          finishEvent: 'success',
          wabaReceived: wabaId ? 'success' : 'pending',
          phoneReceived: phoneNumberId ? 'success' : 'pending',
          summary: wabaId && phoneNumberId
            ? 'FINISH event received / Meta IDs captured / Verifying phone ownership via Meta Graph API...'
            : 'FINISH event received. Exchanging Meta authorization code to resolve IDs server-side...'
        }));
        submitAvailableCredentials();
        if (!connectionSubmitted) scheduleIncompleteError();
      } else if (payload.event === 'CANCEL') {
        clearMessageListener();
        setConnecting(false);
        setDiagnostics(prev => ({ ...prev, finishEvent: 'failed', summary: 'Meta Embedded Signup was cancelled.' }));
        setErrorMessage('Meta Embedded Signup was cancelled by user.');
      } else if (payload.event === 'ERROR') {
        clearMessageListener();
        const msg = typeof payload.data?.error_message === 'string' ? payload.data.error_message : 'WhatsApp Embedded Signup encountered an error.';
        setConnecting(false);
        setDiagnostics(prev => ({ ...prev, finishEvent: 'failed', summary: `Meta error: ${msg}` }));
        setErrorMessage(msg);
      }
    };

    window.addEventListener('message', messageHandler);
    activeMessageListener.current = messageHandler;

    try {
      // Synchronous function wrapper for FB.login to prevent SDK asyncfunction errors
      (window as any).FB.login(
        function(response: any) {
          const code = typeof response?.authResponse?.code === 'string' ? response.authResponse.code.trim() : '';
          const { wabaId, phoneNumberId } = extractIds(response);
          if (wabaId && phoneNumberId) {
            latestCapturedMetaIds.current = { waba_id: wabaId, phone_number_id: phoneNumberId };
          }
          if (code) {
            latestAuthCode.current = code;
            setDiagnostics(prev => ({
              ...prev,
              oauthCode: 'success',
              wabaReceived: wabaId ? 'success' : prev.wabaReceived,
              phoneReceived: phoneNumberId ? 'success' : prev.phoneReceived,
              summary: 'Meta authorization code received. Resolving and verifying account server-side...'
            }));
            submitAvailableCredentials();
            return;
          }

          if (latestCapturedMetaIds.current?.waba_id && latestCapturedMetaIds.current?.phone_number_id) {
            submitAvailableCredentials();
          } else if (!finishEventReceived) {
            scheduleIncompleteError();
          }
        },
        {
          config_id: config.config_id,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3'
          }
        }
      );
    } catch (err: any) {
      clearMessageListener();
      setConnecting(false);
      setErrorMessage(`Failed to launch Meta Embedded Signup: ${err.message}`);
    }
  };

  // 4. Test WhatsApp connection with Meta Graph API
  const handleTestConnection = async () => {
    if (!selectedBranchId) return;
    try {
      setTestingConnection(true);
      setErrorMessage('');
      setSuccessMessage('');
      const res = await api.testBranchWhatsApp(selectedBranchId, currentUserName);
      setIntegration(res.integration);
      setDiagnostics({
        finishEvent: 'success',
        oauthCode: 'success',
        wabaReceived: 'success',
        phoneReceived: 'success',
        graphVerified: 'success',
        summary: res.diagnostics || 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.'
      });
      setSuccessMessage(`WhatsApp connection verified successfully with Meta Graph API for ${selectedBranch?.name}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Meta verification test failed. Please reconnect via Embedded Signup.');
      if (selectedBranchId) loadBranchWhatsApp(selectedBranchId);
    } finally {
      setTestingConnection(false);
    }
  };

  // 5. Disconnect WhatsApp integration
  const handleConfirmDisconnect = async () => {
    if (!selectedBranchId) return;
    try {
      setDisconnecting(true);
      setErrorMessage('');
      const res = await api.disconnectBranchWhatsApp(selectedBranchId, currentUserName);
      setIntegration(res.integration);
      setShowDisconnectModal(false);
      setDiagnostics({
        finishEvent: 'pending',
        oauthCode: 'pending',
        wabaReceived: 'pending',
        phoneReceived: 'pending',
        graphVerified: 'pending',
        summary: 'Disconnected'
      });
      setSuccessMessage(`WhatsApp Business has been disconnected for ${selectedBranch?.name}. Message history retained.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect WhatsApp integration.');
    } finally {
      setDisconnecting(false);
    }
  };

  // 6. Save edited branch settings (Configured WhatsApp Number, Address, Name)
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    const cleanNumber = editBranchNumber.replace(/\D/g, '').slice(-10);
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanNumber)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (e.g., 9491914422) starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      setSavingBranch(true);
      setErrorMessage('');
      const updated = await api.updateBranch(selectedBranchId, {
        name: editBranchName.trim(),
        whatsapp_number: cleanNumber,
        address: editBranchAddress.trim(),
        city: editBranchCity.trim(),
        phone: editBranchPhone.replace(/\D/g, '').slice(-10) || cleanNumber,
        ...(isOwner && { manager_id: editBranchManagerId || undefined })
      }, currentUserName);

      setShowEditBranchModal(false);
      setSuccessMessage(`Branch details and configured WhatsApp number for ${updated.name} updated!`);
      await loadBranchesAndStatus(selectedBranchId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save branch settings.');
    } finally {
      setSavingBranch(false);
    }
  };

  // 7. Create new branch (Owner only)
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    const cleanNumber = newBranchWhatsAppNumber.replace(/\D/g, '').slice(-10);
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanNumber)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number for WhatsApp (e.g. 9491914422).');
      return;
    }

    if (!newBranchName.trim() || !newBranchAddress.trim()) {
      setErrorMessage('Branch name and address are required.');
      return;
    }

    try {
      setCreatingBranch(true);
      setErrorMessage('');
      const created = await api.createBranch({
        name: newBranchName.trim(),
        code: newBranchCode.trim().toUpperCase() || undefined,
        address: newBranchAddress.trim(),
        city: newBranchCity.trim() || 'Hyderabad, Telangana',
        phone: newBranchPhone.replace(/\D/g, '').slice(-10) || cleanNumber,
        whatsapp_number: cleanNumber,
        manager_id: newBranchManagerId || undefined,
        is_active: true
      }, currentUserName);

      setShowAddBranchModal(false);
      // Reset form
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      setNewBranchWhatsAppNumber('');
      setNewBranchManagerId('');
      setSuccessMessage(`New branch '${created.name}' created with configured WhatsApp number ${cleanNumber}!`);
      await loadBranchesAndStatus(created.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create salon branch.');
    } finally {
      setCreatingBranch(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // RBAC Access Guard: Block non-owner and non-manager
  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-base text-slate-900 mb-1">
          Access Restricted
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          WhatsApp Business Integration is restricted to the <strong>Salon Owner</strong> and assigned <strong>Branch Managers</strong>. Staff, cashiers, and stylists do not have permission to manage WhatsApp connections.
        </p>
      </div>
    );
  }

  const isConnected = integration?.status === 'connected' && Boolean(integration?.waba_id && integration?.phone_number_id);
  const isPairing = integration?.status === 'pairing' || connecting;
  const isFailed = integration?.status === 'failed';

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Multi-Branch Architecture Info */}
      <div className="bg-gradient-to-r from-[#1E0812] via-[#3B0E23] to-[#5B132B] text-white p-6 rounded-3xl shadow-md border border-[#D4AF37]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
              <span className="text-[11px] uppercase font-bold tracking-widest">
                Official Meta Embedded Signup · Multi-Branch Coexistence
              </span>
            </div>
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-white">
              WhatsApp Business Coexistence Onboarding
            </h2>
            <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
              Each salon branch has its own dedicated WhatsApp Business line. Staff keep chatting with clients on the branch’s WhatsApp Business mobile app while AI Studio runs booking confirmations, receipts, and automated customer notifications simultaneously.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowAddBranchModal(true)}
                className="py-2.5 px-4 bg-[#D4AF37] hover:bg-[#b5952f] text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Branch</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => selectedBranchId && loadBranchWhatsApp(selectedBranchId)}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs transition-colors"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Branch Selector & Role Context */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#5B132B]" />
            <span className="text-xs font-bold text-slate-900">
              {isOwner ? 'Select Salon Branch:' : 'Your Assigned Branch:'}
            </span>
          </div>

          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              {branches.map(b => {
                const isCurrent = b.id === selectedBranchId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBranch(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                      isCurrent
                        ? 'bg-[#5B132B] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({b.code})</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                <span>Manager: {selectedBranch?.name}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-rose-700">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-700">✕</button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-[#5B132B] mx-auto mb-2" />
          <span>Loading branch WhatsApp integration records...</span>
        </div>
      ) : selectedBranch ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Connection Status & Meta Pairing Action */}
          <div className="lg:col-span-2 space-y-6">
            {/* Branch Details Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#5B132B]/10 text-[#5B132B] flex items-center justify-center font-bold text-xs">
                    {selectedBranch.code}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      {selectedBranch.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{selectedBranch.address}, {selectedBranch.city}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditBranchModal(true)}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Branch</span>
                </button>
              </div>

              {/* Configured WhatsApp Number */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Configured Branch WhatsApp Number
                  </span>
                  <div className="font-mono font-bold text-lg text-slate-900 flex items-center gap-2 mt-0.5">
                    <Phone className="w-4 h-4 text-[#25D366]" />
                    <span>+91 {selectedBranch.whatsapp_number}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Must be registered on the physical mobile device holding WhatsApp Business for this branch.
                  </span>
                </div>

                <div className="shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : isPairing
                        ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                        : isFailed
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-200 text-slate-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-600' : isPairing ? 'bg-blue-600' : isFailed ? 'bg-rose-600' : 'bg-slate-400'
                    }`} />
                    <span>
                      {isConnected ? 'Connected' : isPairing ? 'Pairing In Progress' : isFailed ? 'Connection Failed' : 'Disconnected'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Action Banner: Generate Meta Pairing QR */}
              <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-slate-900">
                      Official Meta Pairing QR Generator
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Launches the official WhatsApp Business App Coexistence onboarding flow directly from Meta. Meta renders the temporary pairing QR code or 8-digit access code in the popup window.
                    </p>
                  </div>
                </div>

                {/* Important instruction banner */}
                <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#25D366]" />
                    <span>On the mobile phone holding branch number (+91 {selectedBranch.whatsapp_number}):</span>
                  </div>
                  <p className="text-slate-700 pl-5 font-medium leading-relaxed">
                    Open <strong>WhatsApp Business → Settings → Account → Business Platform → Connect</strong>, then scan the QR code or enter the access code displayed by Meta.
                  </p>
                  <p className="text-[11px] text-slate-500 pl-5">
                    * Keep the browser popup open until phone pairing is completed on the device.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateMetaPairingQR}
                    disabled={connecting || !config?.is_configured}
                    className="py-3 px-6 bg-[#25D366] hover:bg-[#20ba59] disabled:bg-slate-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Pairing via Meta Coexistence...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>{isConnected ? 'Reconnect / Generate New Meta QR' : 'Generate Meta Pairing QR'}</span>
                      </>
                    )}
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#5B132B]" />
                          <span>Verifying with Graph API...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Test WhatsApp Connection</span>
                        </>
                      )}
                    </button>
                  )}

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setShowDisconnectModal(true)}
                      className="py-3 px-4 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors ml-auto"
                    >
                      <Power className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnostic Trail Checklist */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#5B132B]" />
                  <span>Meta Coexistence Verification Checklist</span>
                </h4>
                <span className="text-[10px] text-slate-400">Server-Side Verified Only</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  diagnostics.finishEvent === 'success' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <span className="font-medium">1. Meta FINISH Event</span>
                  {diagnostics.finishEvent === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <span className="text-[11px] text-slate-400">Pending</span>}
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  diagnostics.wabaReceived === 'success' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <span className="font-medium">2. Meta WABA ID Received</span>
                  {diagnostics.wabaReceived === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <span className="text-[11px] text-slate-400">Pending</span>}
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  diagnostics.phoneReceived === 'success' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <span className="font-medium">3. Phone Number ID Received</span>
                  {diagnostics.phoneReceived === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <span className="text-[11px] text-slate-400">Pending</span>}
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  diagnostics.graphVerified === 'success' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : diagnostics.graphVerified === 'failed' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <span className="font-medium">4. Meta Graph API Verification</span>
                  {diagnostics.graphVerified === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : diagnostics.graphVerified === 'failed' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <span className="text-[11px] text-slate-400">Pending</span>}
                </div>
              </div>

              {diagnostics.summary && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                  {diagnostics.summary}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Stored Secure Admin Records */}
          <div className="space-y-6">
            {/* Meta Numeric IDs Record Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>Verified Meta Graph Assets</span>
              </div>

              {/* WABA ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Meta WABA ID
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900">
                  <span>{integration?.waba_id || 'Not received'}</span>
                  {integration?.waba_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(integration.waba_id!, 'waba')}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copy WABA ID"
                    >
                      {copiedField === 'waba' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Phone Number ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Meta Phone Number ID
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900">
                  <span>{integration?.phone_number_id || 'Not received'}</span>
                  {integration?.phone_number_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(integration.phone_number_id!, 'phone')}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copy Phone Number ID"
                    >
                      {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Meta Verified Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Meta Display / Verified Name
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
                  {integration?.display_name || selectedBranch.name}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Connected:</span>
                  <span className="font-semibold text-slate-700">
                    {integration?.connected_at ? new Date(integration.connected_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Last Verified:</span>
                  <span className="font-semibold text-slate-700">
                    {integration?.last_verified_at ? new Date(integration.last_verified_at).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="bg-[#120B0F] text-white p-5 rounded-3xl shadow-xs space-y-2 text-xs border border-[#D4AF37]/20">
              <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Token Exposure Guarantee</span>
              </div>
              <p className="text-white/70 text-[11px] leading-relaxed">
                Tokens, secrets, and system user credentials remain strictly encapsulated inside production server environment variables. The browser never receives raw access tokens or OAuth secret keys.
              </p>
            </div>
          </div>

          {/* OWNER TEST & AUTOMATION CONSOLE */}
          {isOwner && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Card 1: Send Real Test Template */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-slate-900">
                        Send Real Test WhatsApp Template
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Dispatches official Meta approved templates from +91 89857 99459
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Owner Test Area
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Approved Meta Template:
                    </label>
                    <select
                      value={testTemplate}
                      onChange={e => setTestTemplate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800"
                    >
                      <option value="gl_appointment_confirmation">
                        gl_appointment_confirmation (Booking Confirmation - en_US)
                      </option>
                      <option value="the_glossylooks_customer_feedback">
                        the_glossylooks_customer_feedback (Customer Experience Review - en)
                      </option>
                      <option value="hello_world">
                        hello_world (Meta Standard Utility Test - en_US)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Recipient Mobile Number:
                    </label>
                    <input
                      type="tel"
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      placeholder={selectedBranch.phone || '9154744608'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Note: While Meta App Review is in progress, real WhatsApp delivery is restricted by Meta to verified test numbers configured in the Meta Developer Portal.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={sendingTestTemplate}
                    onClick={handleSendTestTemplate}
                    className="w-full py-2.5 px-4 bg-[#5B132B] hover:bg-[#430D1F] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-xs"
                  >
                    {sendingTestTemplate ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending via Meta Cloud API...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#D4AF37]" />
                        <span>Dispatch Test Template Now</span>
                      </>
                    )}
                  </button>

                  {testSendResult && (
                    <div className={`p-3 rounded-xl border text-xs ${
                      testSendResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : testSendResult.status === 'pending_approval'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        {testSendResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <span>
                          {testSendResult.success
                            ? 'Template Sent Successfully via Meta Graph API!'
                            : testSendResult.status === 'pending_approval'
                            ? 'Status: Pending Meta Approval (App Review Sandbox)'
                            : 'Test Delivery Failed'}
                        </span>
                      </div>
                      {testSendResult.message_id && (
                        <p className="mt-1 font-mono text-[11px]">Meta Message ID: {testSendResult.message_id}</p>
                      )}
                      {testSendResult.error && (
                        <p className="mt-1 text-[11px] leading-relaxed">{testSendResult.error}</p>
                      )}
                      {testSendResult.diagnostics && (
                        <p className="mt-1 font-mono text-[10px] text-slate-500">{testSendResult.diagnostics}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Interactive Webhook Simulator */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-slate-900">
                        Meta Webhook Feedback Reply Simulator
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Simulates customer tapping Quick Reply buttons (Good / Average / Bad)
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    Test Harness
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-[11px] text-slate-600">
                    Test the complete customer journey without waiting for webhook callbacks. Simulates incoming button payloads and verifies auto-replies:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={simulatingFeedback}
                      onClick={() => handleSimulateFeedback('good')}
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex flex-col items-center gap-1 transition-colors disabled:opacity-60"
                    >
                      <span>👍 &ldquo;Good&rdquo;</span>
                      <span className="text-[9px] font-normal text-emerald-600">→ Review link</span>
                    </button>

                    <button
                      type="button"
                      disabled={simulatingFeedback}
                      onClick={() => handleSimulateFeedback('average')}
                      className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold flex flex-col items-center gap-1 transition-colors disabled:opacity-60"
                    >
                      <span>😐 &ldquo;Average&rdquo;</span>
                      <span className="text-[9px] font-normal text-amber-600">→ Manager alert</span>
                    </button>

                    <button
                      type="button"
                      disabled={simulatingFeedback}
                      onClick={() => handleSimulateFeedback('bad')}
                      className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-bold flex flex-col items-center gap-1 transition-colors disabled:opacity-60"
                    >
                      <span>👎 &ldquo;Bad&rdquo;</span>
                      <span className="text-[9px] font-normal text-rose-600">→ Manager alert</span>
                    </button>
                  </div>

                  {simulationResult && (
                    <div className={`p-3 rounded-xl border text-xs ${
                      simulationResult.success ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="font-bold flex items-center gap-1">
                        <Check className="w-4 h-4 text-purple-600" />
                        <span>{simulationResult.message || 'Simulation processed successfully!'}</span>
                      </div>
                      {simulationResult.auto_reply_sent && (
                        <div className="mt-1.5 p-2 bg-white/80 rounded-lg text-[11px] text-slate-800 border border-purple-100">
                          <strong>Automated WhatsApp Reply Sent:</strong>
                          <p className="mt-0.5 text-slate-600 italic leading-relaxed">&ldquo;{simulationResult.auto_reply_sent}&rdquo;</p>
                        </div>
                      )}
                      {simulationResult.alert_generated && (
                        <p className="mt-1 text-[11px] text-amber-700 font-semibold">
                          ⚠️ Salon Manager Notification & Audit Alert Logged!
                        </p>
                      )}
                    </div>
                  )}

                  {/* Branch Message Logs Trigger */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => selectedBranch && loadBranchLogs(selectedBranch.id)}
                      className="text-xs text-[#5B132B] hover:underline font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingBranchLogs ? 'animate-spin' : ''}`} />
                      <span>Refresh Recent Logs for {selectedBranch.name}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">
                      {branchLogs.length} logs recorded
                    </span>
                  </div>

                  {branchLogs.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {branchLogs.slice(0, 4).map(log => (
                        <div key={log.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] flex items-center justify-between">
                          <span className="font-mono text-slate-700 font-semibold">{log.template_name}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* MODAL: ADD NEW BRANCH (Owner Only) */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBranch}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#5B132B]" />
                <span>Add New Salon Branch</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Branch Name *</label>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                placeholder="e.g. Kondapur Main Branch"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Branch Code</label>
                <input
                  type="text"
                  value={newBranchCode}
                  onChange={e => setNewBranchCode(e.target.value)}
                  placeholder="e.g. KND-02"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Branch WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={newBranchWhatsAppNumber}
                  onChange={e => setNewBranchWhatsAppNumber(e.target.value)}
                  placeholder="e.g. 9491914422"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Address *</label>
              <input
                type="text"
                required
                value={newBranchAddress}
                onChange={e => setNewBranchAddress(e.target.value)}
                placeholder="Plot no, Landmark, Road"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">City / State</label>
                <input
                  type="text"
                  value={newBranchCity}
                  onChange={e => setNewBranchCity(e.target.value)}
                  placeholder="Hyderabad, Telangana"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Contact Phone</label>
                <input
                  type="tel"
                  value={newBranchPhone}
                  onChange={e => setNewBranchPhone(e.target.value)}
                  placeholder="Desk phone number"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Assign Branch Manager</label>
              <select
                value={newBranchManagerId}
                onChange={e => setNewBranchManagerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
              >
                <option value="">-- Select Manager User --</option>
                {adminUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()} - {u.user_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={creatingBranch}
                className="flex-1 py-2.5 bg-[#5B132B] hover:bg-[#430D1F] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                {creatingBranch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Create Branch</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT BRANCH DETAILS */}
      {showEditBranchModal && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBranch}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#5B132B]" />
                <span>Edit Branch Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditBranchModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Branch Name *</label>
              <input
                type="text"
                required
                value={editBranchName}
                onChange={e => setEditBranchName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Configured WhatsApp Business Number *</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600 font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editBranchNumber}
                  onChange={e => setEditBranchNumber(e.target.value)}
                  placeholder="9491914422"
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Saving this number sets the phone target for Meta Embedded Signup Coexistence onboarding.
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Physical Address *</label>
              <input
                type="text"
                required
                value={editBranchAddress}
                onChange={e => setEditBranchAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">City / State</label>
                <input
                  type="text"
                  value={editBranchCity}
                  onChange={e => setEditBranchCity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Contact Phone</label>
                <input
                  type="tel"
                  value={editBranchPhone}
                  onChange={e => setEditBranchPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                />
              </div>
            </div>

            {isOwner && (
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Branch Manager Assignment</label>
                <select
                  value={editBranchManagerId}
                  onChange={e => setEditBranchManagerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5B132B]"
                >
                  <option value="">-- Unassigned --</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()} - {u.user_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingBranch}
                className="flex-1 py-2.5 bg-[#5B132B] hover:bg-[#430D1F] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                {savingBranch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEditBranchModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DISCONNECT CONFIRMATION */}
      {showDisconnectModal && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Power className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-base text-slate-900">
                Disconnect {selectedBranch.name}?
              </h3>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Disconnecting will pause automated booking confirmations and digital receipts for this branch until reconnected. Existing appointment logs and transaction records are preserved.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                <span>Confirm Disconnect</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: META PHONE CANDIDATES SELECTION (If Meta returns multiple numbers) */}
      {phoneCandidates.length > 0 && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <h3 className="font-serif font-bold text-base text-slate-900">
              Select Branch WhatsApp Number
            </h3>
            <p className="text-slate-500 text-[11px]">
              Meta returned more than one phone number under this WhatsApp Business Account. Choose the number belonging to {selectedBranch.name}:
            </p>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {phoneCandidates.map(cand => (
                <div key={cand.phone_number_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-slate-900">{cand.display_phone_number || cand.phone_number_id}</div>
                    <div className="text-[10px] text-slate-400">ID: {cand.phone_number_id} · {cand.verified_name || 'Salon'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      submitConnection({
                        wabaId: cand.waba_id,
                        phoneNumberId: cand.phone_number_id
                      });
                      setPhoneCandidates([]);
                    }}
                    className="py-1.5 px-3 bg-[#5B132B] hover:bg-[#430D1F] text-white rounded-xl font-bold text-xs"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPhoneCandidates([])}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
