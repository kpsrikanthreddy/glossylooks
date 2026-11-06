/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production-Ready WhatsApp Inbox & Customer Chat Module
 * Part of The Glossy Looks Salon Operations & Multi-Tenant Architecture
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  User,
  Calendar,
  Phone,
  Tag,
  Sparkles,
  ExternalLink,
  RefreshCw,
  X,
  FileText,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Lock,
  Archive,
  MailCheck,
  Filter,
  Info,
  Globe
} from 'lucide-react';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppInboxFilter,
  Customer,
  AdminUser
} from '../../../types/salon';
import { api } from '../../../lib/api';

interface WhatsAppInboxProps {
  currentUser: AdminUser;
  onNavigateToCustomer?: (customerMobile: string) => void;
  onNavigateToBooking?: (customerMobile: string, customerName?: string) => void;
}

export const WhatsAppInbox: React.FC<WhatsAppInboxProps> = ({
  currentUser,
  onNavigateToCustomer,
  onNavigateToBooking
}) => {
  // Access control check (defense in depth)
  const isAuthorized = currentUser.role === 'owner' || currentUser.role === 'manager';

  // State
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<WhatsAppInboxFilter>('all');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Linked Customer CRM State
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateCustomName, setTemplateCustomName] = useState('');
  const [templateService, setTemplateService] = useState('Hair & Bridal Styling');
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);

  // Mobile View state (toggle between list and chat on small screens)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Message scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Selected conversation object
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Pagination State
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // 1. Fetch Conversations
  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoadingConversations(true);
    try {
      const data = await api.getWhatsAppConversations(activeFilter, searchQuery);
      setConversations(data || []);
      // If none selected and desktop, pick the first
      if (!selectedConvId && data && data.length > 0 && window.innerWidth >= 768) {
        setSelectedConvId(data[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load conversations:', err.message);
    } finally {
      if (!silent) setIsLoadingConversations(false);
    }
  };

  // 2. Fetch Messages for selected conversation
  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    setSendError(null);
    try {
      const res = await api.getWhatsAppMessages(convId, 50);
      const rawMessages: WhatsAppMessage[] = Array.isArray(res) ? res : (res?.messages || []);
      setMessages(rawMessages);
      setHasMoreMessages(Boolean((res as any)?.has_more));

      if (res && !Array.isArray(res) && res.conversation) {
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, ...res.conversation, unread_count: 0 } : c))
        );
      }
      // Look up linked customer by phone
      const convPhone = (!Array.isArray(res) && res.conversation?.customer_phone) || activeConversation?.customer_phone;
      if (convPhone) {
        const cleanDigits = convPhone.replace(/\D/g, '').slice(-10);
        api.getCustomers(cleanDigits).then(custs => {
          const match = custs.find(c => c.mobile.replace(/\D/g, '').endsWith(cleanDigits));
          setLinkedCustomer(match || null);
        }).catch(() => setLinkedCustomer(null));
      }
    } catch (err: any) {
      console.warn('Failed to load messages:', err.message);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  // 2b. Load older messages (pagination)
  const handleLoadOlderMessages = async () => {
    if (!selectedConvId || isLoadingOlder || messages.length === 0) return;
    setIsLoadingOlder(true);
    try {
      const oldestTimestamp = messages[0].created_at;
      const res = await api.getWhatsAppMessages(selectedConvId, 50, oldestTimestamp);
      const olderList: WhatsAppMessage[] = Array.isArray(res) ? res : (res?.messages || []);
      if (olderList.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueOlder = olderList.filter(m => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
      }
      setHasMoreMessages(Boolean((res as any)?.has_more && olderList.length >= 50));
    } catch (err: any) {
      console.warn('Failed to load older messages:', err.message);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // 3. Load available WhatsApp templates
  const loadTemplates = async () => {
    try {
      const res = await api.getWhatsAppTemplatesList();
      const rawList = res?.data || [];
      const approved = rawList.filter((t: any) => t.status === 'APPROVED');
      setAvailableTemplates(approved.length > 0 ? approved : [
        { name: 'gl_appointment_confirmation', category: 'UTILITY' },
        { name: 'the_glossylooks_customer_feedback', category: 'MARKETING' },
        { name: 'gl_bill_receipt', category: 'UTILITY' }
      ]);
    } catch {
      setAvailableTemplates([
        { name: 'gl_appointment_confirmation', category: 'UTILITY' },
        { name: 'the_glossylooks_customer_feedback', category: 'MARKETING' },
        { name: 'gl_bill_receipt', category: 'UTILITY' }
      ]);
    }
  };

  // Initial conversation load & template fetch
  useEffect(() => {
    if (isAuthorized) {
      fetchConversations();
      loadTemplates();
    }
  }, [activeFilter, searchQuery, isAuthorized]);

  // When selected conversation changes
  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      setIsMobileChatOpen(true);
    }
  }, [selectedConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Real-Time Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!isAuthorized) return;

    let eventSource: EventSource | null = null;
    try {
      // Direct stream endpoint
      eventSource = new EventSource('/api/admin/whatsapp/inbox/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'inbound_message' || data.type === 'outbound_message') {
            const { conversationId, message, conversation } = data;
            
            // If the incoming message belongs to active conversation, append it immediately
            if (conversationId === selectedConvId && message) {
              setMessages(prev => {
                if (prev.some(m => m.id === message.id || (m.meta_message_id && m.meta_message_id === message.meta_message_id))) {
                  return prev;
                }
                return [...prev, message];
              });
            }

            // Update conversation list
            setConversations(prev => {
              const existingIdx = prev.findIndex(c => c.id === conversationId);
              if (existingIdx !== -1) {
                const updated = {
                  ...prev[existingIdx],
                  ...(conversation || {}),
                  last_message_text: message?.text_body || prev[existingIdx].last_message_text,
                  last_message_at: message?.created_at || new Date().toISOString(),
                  unread_count: conversationId === selectedConvId ? 0 : (prev[existingIdx].unread_count || 0) + (data.type === 'inbound_message' ? 1 : 0)
                };
                const rest = prev.filter(c => c.id !== conversationId);
                return [updated, ...rest];
              } else if (conversation) {
                return [conversation, ...prev];
              }
              return prev;
            });
          } else if (data.type === 'message_status') {
            const { metaMessageId, status } = data;
            setMessages(prev =>
              prev.map(m => (m.meta_message_id === metaMessageId ? { ...m, status } : m))
            );
          } else if (data.type === 'conversation_read') {
            setConversations(prev =>
              prev.map(c => (c.id === data.conversationId ? { ...c, unread_count: 0 } : c))
            );
          }
        } catch {
          // Ignore parse errors on keepalive comments
        }
      };

      eventSource.onerror = () => {
        // SSE error or reconnecting; fallback to gentle polling every 12 seconds
      };
    } catch (e) {
      console.warn('SSE could not be initialized:', e);
    }

    // Gentle polling fallback
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConvId) {
        fetchMessages(selectedConvId, true);
      }
    }, 12000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [selectedConvId, isAuthorized]);

  // 5. Send Manual Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !messageInput.trim() || isSending) return;

    const textToSend = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    setSendError(null);

    // Optimistic message representation
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      salon_id: activeConversation?.salon_id || 'tgl-gachibowli-main',
      conversation_id: selectedConvId,
      direction: 'OUTBOUND',
      message_type: 'text',
      text_body: textToSend,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await api.sendWhatsAppManualMessage(selectedConvId, textToSend);
      // Replace optimistic message with actual message
      setMessages(prev => prev.map(m => (m.id === tempId ? res.message : m)));
      if (res.conversation) {
        setConversations(prev =>
          prev.map(c => (c.id === selectedConvId ? { ...c, ...res.conversation } : c))
        );
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to deliver message via WhatsApp.');
      // Mark optimistic message as failed
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, status: 'failed', error_message: err.message } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  // 6. Send Approved Template
  const handleSendTemplate = async () => {
    if (!selectedConvId || !selectedTemplateName || isSendingTemplate) return;

    setIsSendingTemplate(true);
    setSendError(null);

    try {
      const customerName = templateCustomName || activeConversation?.customer_name || 'Valued Client';
      const res = await api.sendWhatsAppTemplateMessage(selectedConvId, {
        template_name: selectedTemplateName,
        parameters: {
          customerName,
          service: templateService
        },
        custom_body_text: `[Approved Template: ${selectedTemplateName}] Sent to ${customerName}`
      });

      setMessages(prev => [...prev, res.message]);
      if (res.conversation) {
        setConversations(prev =>
          prev.map(c => (c.id === selectedConvId ? { ...c, ...res.conversation } : c))
        );
      }
      setIsTemplateModalOpen(false);
    } catch (err: any) {
      setSendError(err.message || 'Failed to dispatch WhatsApp template.');
    } finally {
      setIsSendingTemplate(false);
    }
  };

  // 7. Toggle Conversation Status (OPEN/CLOSED)
  const handleToggleStatus = async () => {
    if (!selectedConvId || !activeConversation) return;
    const newStatus = activeConversation.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const res = await api.updateWhatsAppConversationStatus(selectedConvId, { status: newStatus });
      setConversations(prev =>
        prev.map(c => (c.id === selectedConvId ? { ...c, status: newStatus } : c))
      );
    } catch (err: any) {
      console.warn('Failed to update conversation status:', err.message);
    }
  };

  // Format timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format date separators (Today, Yesterday, 5 Nov 2026, etc.)
  const formatDateSeparator = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - dDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Render message delivery status checkmarks
  const renderDeliveryStatus = (status?: string) => {
    switch (status) {
      case 'sending':
        return <span title="Sending to Meta..."><Clock className="w-3 h-3 text-white/50 animate-pulse" /></span>;
      case 'sent':
        return <span title="Sent to Meta Cloud API"><Check className="w-3.5 h-3.5 text-white/70" /></span>;
      case 'delivered':
        return <span title="Delivered to customer device"><CheckCheck className="w-3.5 h-3.5 text-white/70" /></span>;
      case 'read':
        return <span title="Read by customer"><CheckCheck className="w-3.5 h-3.5 text-sky-400 font-bold" /></span>;
      case 'failed':
        return <span title="Delivery failed"><AlertCircle className="w-3.5 h-3.5 text-rose-400" /></span>;
      default:
        return null;
    }
  };

  // Authorization check guard
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-white rounded-2xl border border-rose-200 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-xl text-slate-900 mb-2">Access Restricted</h3>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          The WhatsApp Customer Chat & Inbox is restricted to Salon Owners and authorized Managers only. Staff and Cashier accounts do not have permission to view or dispatch direct customer messages.
        </p>
      </div>
    );
  }

  const isWindowOpen = activeConversation?.window_status?.isOpen ?? false;
  const windowRemaining = activeConversation?.window_status?.formattedRemaining;

  return (
    <div className="h-[calc(100vh-140px)] min-h-[600px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* =====================================================================
          MAIN INBOX TWO-COLUMN LAYOUT
         ===================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ===================================================================
            LEFT PANEL: CONVERSATION LIST (Hidden on mobile if chat is open)
           =================================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-slate-50/50 shrink-0 ${
            isMobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3.5 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">WhatsApp Inbox</h2>
                  <span className="text-[10px] text-slate-500 block">Direct Customer Messaging</span>
                </div>
              </div>
              <button
                onClick={() => fetchConversations()}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Conversations"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingConversations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customer or mobile..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#5B132B] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Segmented Filter Controls (per frontend-design constitution) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-[11px] font-medium">
              {(['all', 'unread', 'open', 'closed'] as WhatsAppInboxFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex-1 py-1 rounded-md transition-colors capitalize ${
                    activeFilter === f
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoadingConversations && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5B132B]" />
                <span>Loading conversations...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">No conversations found</p>
                <p className="text-[11px] mt-1">Customer WhatsApp inquiries will automatically appear here.</p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = conv.id === selectedConvId;
                const initials = (conv.customer_name || 'WC')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setIsMobileChatOpen(true);
                    }}
                    className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 relative ${
                      isSelected ? 'bg-amber-50/60 border-l-4 border-l-[#5B132B]' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B132B] to-[#2B0914] text-[#D4AF37] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {initials}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {conv.customer_name || 'Valued Customer'}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono mb-1 truncate">
                        {conv.customer_phone}
                      </div>

                      <p className="text-xs text-slate-600 truncate line-clamp-1">
                        {conv.last_message_text || 'No messages yet'}
                      </p>

                      {/* Quiet Status & Window Indicator */}
                      <div className="mt-1.5 flex items-center flex-wrap gap-1.5 text-[10px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            conv.status === 'OPEN' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-slate-500 uppercase tracking-wider font-semibold text-[9px]">
                          {conv.status}
                        </span>

                        {/* Channel Badge */}
                        {conv.source_channel === 'WEBSITE_ENQUIRY' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Web Enquiry
                          </span>
                        ) : conv.source_channel === 'MIXED' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            WhatsApp + Web
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            WhatsApp
                          </span>
                        )}

                        {conv.window_status?.isOpen && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-emerald-700 font-medium">24h active</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Unread Badge */}
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#5B132B] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANEL: CHAT WINDOW & CONVERSATION DETAIL
           =================================================================== */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/30 overflow-hidden ${
            !isMobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Top Header */}
              <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    title="Back to Conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5B132B] to-[#2B0914] text-[#D4AF37] font-bold text-xs flex items-center justify-center shrink-0">
                    {(activeConversation.customer_name || 'WC')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {activeConversation.customer_name || 'Valued Customer'}
                      </h3>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          activeConversation.status === 'OPEN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {activeConversation.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>{activeConversation.customer_phone}</span>
                      {linkedCustomer && (
                        <>
                          <span>·</span>
                          <span className="text-[#5B132B] font-sans font-semibold">Registered Client</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors hidden sm:inline-flex items-center gap-1.5 ${
                      showCustomerPanel
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-[#5B132B]" />
                    <span>CRM Panel</span>
                  </button>

                  <button
                    onClick={handleToggleStatus}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                    title={activeConversation.status === 'OPEN' ? 'Close Conversation' : 'Reopen Conversation'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {activeConversation.status === 'OPEN' ? 'Close' : 'Reopen'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 24-Hour WhatsApp Customer Service Window Banner */}
              <div
                className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
                  isWindowOpen
                    ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isWindowOpen ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold">Customer service window open</span>
                      {windowRemaining && <span className="text-emerald-700 text-[11px]">({windowRemaining})</span>}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold">
                        {activeConversation.last_inbound_at ? 'Customer service window expired' : 'WhatsApp window not active'}
                      </span>
                      <span className="text-amber-700 text-[11px] hidden sm:inline">
                        {activeConversation.last_inbound_at
                          ? '(Over 24h since customer last sent a WhatsApp message. Meta requires an approved template)'
                          : '(Customer contacted via website enquiry. To message them on WhatsApp, please dispatch an approved template)'}
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs ${
                    isWindowOpen
                      ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-[#120B0F] hover:brightness-105'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Send Template</span>
                </button>
              </div>

              {/* Main Content Area (Messages + Collapsible Customer CRM Panel) */}
              <div className="flex-1 flex overflow-hidden">
                {/* Messages Container */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF7F5]/50">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Load Older Messages Pagination Header */}
                    {hasMoreMessages && (
                      <div className="flex justify-center pb-2">
                        <button
                          onClick={handleLoadOlderMessages}
                          disabled={isLoadingOlder}
                          className="text-[11px] font-semibold text-[#5B132B] hover:text-[#3B0C1C] bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                        >
                          {isLoadingOlder ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-[#5B132B]" />
                              <span>Loading older messages...</span>
                            </>
                          ) : (
                            <span>Load older messages</span>
                          )}
                        </button>
                      </div>
                    )}

                    {isLoadingMessages ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5B132B]" />
                        <span>Loading message thread...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No messages in this conversation</p>
                        <p className="text-[11px] mt-1">Start by sending an approved WhatsApp template below.</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isInbound = msg.direction === 'INBOUND' || String(msg.direction).toLowerCase() === 'inbound';
                        const messageText = msg.text_body || (msg as any).body || '';
                        const isNewDay = idx === 0 || (() => {
                          const prevDate = messages[idx - 1]?.created_at ? new Date(messages[idx - 1].created_at!).toDateString() : '';
                          const currDate = msg.created_at ? new Date(msg.created_at).toDateString() : '';
                          return Boolean(prevDate && currDate && prevDate !== currDate);
                        })();

                        return (
                          <React.Fragment key={msg.id || idx}>
                            {/* Calendar Date Separator */}
                            {isNewDay && (
                              <div className="flex justify-center my-3">
                                <span className="bg-slate-200/90 text-slate-700 text-[10px] font-semibold tracking-wide px-3 py-0.5 rounded-full shadow-2xs uppercase">
                                  {formatDateSeparator(msg.created_at)}
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                            >
                            {/* Message Bubble */}
                            <div
                              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs relative ${
                                isInbound
                                  ? msg.source_badge === 'WEBSITE_ENQUIRY'
                                    ? 'bg-purple-50/90 text-purple-950 border border-purple-200/90 rounded-tl-xs'
                                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                                  : 'bg-[#5B132B] text-white rounded-tr-xs'
                              }`}
                            >
                              {/* Source Badge Pill */}
                              {msg.source_badge === 'WEBSITE_ENQUIRY' && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md mb-1.5 border border-purple-200">
                                  <FileText className="w-3 h-3 text-purple-600" />
                                  <span>Website Enquiry</span>
                                </div>
                              )}
                              {msg.source_badge === 'AUTOMATIC' && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-200 bg-cyan-950/70 px-2 py-0.5 rounded-md mb-1.5 border border-cyan-800">
                                  <Sparkles className="w-3 h-3 text-cyan-400" />
                                  <span>Automated Feedback Bot</span>
                                </div>
                              )}
                              {msg.source_badge === 'TEMPLATE' && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] bg-black/40 px-2 py-0.5 rounded-md mb-1.5 border border-[#D4AF37]/30">
                                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                                  <span>Meta Approved Template: {msg.template_name || 'Standard'}</span>
                                </div>
                              )}
                              {msg.source_badge === 'ADMIN' && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-white/10 px-2 py-0.5 rounded-md mb-1.5">
                                  <User className="w-3 h-3 text-[#D4AF37]" />
                                  <span>Admin Reply</span>
                                </div>
                              )}
                              {isInbound && msg.source_badge !== 'WEBSITE_ENQUIRY' && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5 border border-emerald-200">
                                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </div>
                              )}

                              {/* Interactive Quick Reply Badge */}
                              {msg.message_type === 'interactive' && (
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-600 mb-1">
                                  <span>Button Quick Reply</span>
                                </div>
                              )}

                              {/* Message Text Body */}
                              <p className="whitespace-pre-wrap leading-relaxed break-words font-sans">
                                {messageText}
                              </p>

                              {/* Error notice if message failed */}
                              {msg.status === 'failed' && msg.error_message && (
                                <div className="mt-1 pt-1 border-t border-rose-300/30 text-[10px] text-rose-200 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>{msg.error_message}</span>
                                </div>
                              )}

                              {/* Footer Timestamp & Delivery Status */}
                              <div
                                className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                                  isInbound ? 'text-slate-400' : 'text-white/60'
                                }`}
                              >
                                <span>{formatTime(msg.created_at)}</span>
                                {!isInbound && renderDeliveryStatus(msg.status)}
                              </div>
                            </div>

                            {/* Sent By Tag for manual staff replies */}
                            {!isInbound && msg.sent_by_user_name && (
                              <span className="text-[9px] text-slate-400 mt-0.5 mr-1 font-mono">
                                Sent by {msg.sent_by_user_name}
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Send Error Notice */}
                  {sendError && (
                    <div className="mx-4 mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{sendError}</span>
                      </div>
                      <button
                        onClick={() => setSendError(null)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Message Composer */}
                  <div className="p-3 bg-white border-t border-slate-200">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        disabled={!isWindowOpen || isSending}
                        placeholder={
                          isWindowOpen
                            ? 'Type your WhatsApp reply...'
                            : '24-hour service window expired. Use "Send Template" to reply.'
                        }
                        className={`flex-1 px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                          isWindowOpen
                            ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#5B132B]'
                            : 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      />

                      {isWindowOpen ? (
                        <button
                          type="submit"
                          disabled={!messageInput.trim() || isSending}
                          className="px-4 py-2.5 bg-[#5B132B] hover:bg-[#430D1F] text-white font-bold rounded-xl text-xs transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Send</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsTemplateModalOpen(true)}
                          className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:brightness-105 text-[#120B0F] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Send Template</span>
                        </button>
                      )}
                    </form>
                  </div>
                </div>

                {/* Collapsible Customer CRM Panel */}
                {showCustomerPanel && (
                  <div className="w-72 bg-white border-l border-slate-200 p-4 overflow-y-auto hidden lg:flex flex-col shrink-0 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Client Profile</h4>
                      <button
                        onClick={() => setShowCustomerPanel(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Customer Header Lockup */}
                    <div className="text-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5B132B] to-[#2B0914] text-[#D4AF37] font-bold text-base flex items-center justify-center mx-auto mb-2 shadow-xs">
                        {(activeConversation.customer_name || 'WC')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <h5 className="font-bold text-sm text-slate-900">
                        {activeConversation.customer_name || 'Valued Customer'}
                      </h5>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        {activeConversation.customer_phone}
                      </span>
                    </div>

                    {/* Quick CRM Metrics */}
                    {linkedCustomer ? (
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Total Visits</span>
                            <strong className="text-sm text-slate-900 font-bold">
                              {linkedCustomer.visit_count || 1}
                            </strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Total Spend</span>
                            <strong className="text-sm text-[#5B132B] font-bold">
                              ₹{(linkedCustomer.total_spend || 0).toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </div>

                        {linkedCustomer.feedback_rating && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <span className="text-[10px] text-slate-500 block mb-0.5">Customer Satisfaction</span>
                            <span
                              className={`text-xs font-bold capitalize ${
                                linkedCustomer.feedback_rating === 'good'
                                  ? 'text-emerald-700'
                                  : linkedCustomer.feedback_rating === 'average'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              ⭐ {linkedCustomer.feedback_rating} Experience
                            </span>
                          </div>
                        )}

                        {linkedCustomer.last_visit_at && (
                          <div className="text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">Last Visited:</span>{' '}
                            {new Date(linkedCustomer.last_visit_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-amber-800 text-[11px] mb-4">
                        <p className="font-semibold mb-0.5">Unregistered Contact</p>
                        <span>This phone number has not yet been saved to your customer CRM directory.</span>
                      </div>
                    )}

                    {/* Quick CRM Navigation Actions */}
                    <div className="space-y-2 mt-auto pt-3 border-t border-slate-100">
                      {onNavigateToBooking && (
                        <button
                          onClick={() =>
                            onNavigateToBooking(
                              activeConversation.customer_phone,
                              activeConversation.customer_name
                            )
                          }
                          className="w-full py-2 bg-[#5B132B] hover:bg-[#430D1F] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Book Appointment</span>
                        </button>
                      )}

                      {onNavigateToCustomer && (
                        <button
                          onClick={() => onNavigateToCustomer(activeConversation.customer_phone)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          <span>View in Customers Tab</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-serif font-bold text-lg text-slate-800 mb-1">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose an inquiry from the left panel to review messages and reply via WhatsApp Cloud API.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          TEMPLATE DISPATCH MODAL
         ===================================================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 relative">
            <button
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#5B132B] mb-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif font-bold text-lg text-slate-900">Send WhatsApp Template</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select an approved Meta template to contact this customer (satisfies WhatsApp 24-hour service window rules).
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Approved Template</label>
                <select
                  value={selectedTemplateName}
                  onChange={e => setSelectedTemplateName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#5B132B]"
                >
                  <option value="">-- Choose Meta Template --</option>
                  {availableTemplates.map((t: any, idx: number) => (
                    <option key={idx} value={t.name}>
                      {t.name} ({t.category || 'APPROVED'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Recipient Name</label>
                <input
                  type="text"
                  value={templateCustomName || activeConversation?.customer_name || ''}
                  onChange={e => setTemplateCustomName(e.target.value)}
                  placeholder="e.g. Sneha Reddy"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Service / Note Parameter</label>
                <input
                  type="text"
                  value={templateService}
                  onChange={e => setTemplateService(e.target.value)}
                  placeholder="e.g. Signature Bridal Makeup"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#5B132B]"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Dispatched from configured salon WhatsApp number to{' '}
                  <strong className="font-mono">{activeConversation?.customer_phone}</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendTemplate}
                  disabled={!selectedTemplateName || isSendingTemplate}
                  className="px-5 py-2 bg-[#5B132B] hover:bg-[#430D1F] text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSendingTemplate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Template...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Template</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
