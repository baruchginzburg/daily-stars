"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Star, 
  Plus, 
  Minus, 
  LogOut, 
  UserPlus, 
  Trash2, 
  Lock, 
  Clock, 
  Users, 
  ArrowRight, 
  RefreshCw, 
  PlusCircle, 
  Trophy, 
  DollarSign, 
  ChevronRight,
  Shield,
  Activity,
  History
} from "lucide-react";

interface Profile {
  id: string;
  name: string;
  role: "ADMIN" | "USER";
}

interface User {
  id: string;
  name: string;
  role: "ADMIN" | "USER";
  balance?: number;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  userId: string;
  user: {
    name: string;
  };
  createdBy: {
    name: string;
  };
}

export default function Home() {
  // Session & Authentication
  const [session, setSession] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Kids Data (Admin Only)
  const [kids, setKids] = useState<User[]>([]);
  const [selectedKid, setSelectedKid] = useState<User | null>(null);
  const [isLoadingKids, setIsLoadingKids] = useState(false);

  // New Profile Form
  const [isAddingKid, setIsAddingKid] = useState(false);
  const [newKidName, setNewKidName] = useState("");
  const [newKidPin, setNewKidPin] = useState("");
  const [addKidError, setAddKidError] = useState<string | null>(null);
  const [isCreatingKid, setIsCreatingKid] = useState(false);

  // Transaction Form (Admin Only)
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

  // Transaction Logs
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("ALL"); // "ALL" or specific kid ID

  // Check login session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Fetch data on session change
  useEffect(() => {
    if (session) {
      if (session.role === "ADMIN") {
        fetchKids();
      }
      fetchTransactions();
    } else {
      fetchProfiles();
    }
  }, [session]);

  const checkSession = async () => {
    setIsLoadingSession(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated) {
        setSession(data.user);
      } else {
        setSession(null);
      }
    } catch (e) {
      setSession(null);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/auth/profiles");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProfiles(data);
      }
    } catch (e) {
      console.error("Error fetching profiles:", e);
    }
  };

  const fetchKids = async () => {
    setIsLoadingKids(true);
    try {
      const res = await fetch("/api/kids");
      const data = await res.json();
      if (Array.isArray(data)) {
        setKids(data);
        // Default select the first kid if none selected
        if (data.length > 0 && !selectedKid) {
          setSelectedKid(data[0]);
        } else if (selectedKid) {
          // Sync selected kid with fresh data
          const updatedSelected = data.find(k => k.id === selectedKid.id);
          if (updatedSelected) {
            setSelectedKid(updatedSelected);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching kids:", e);
    } finally {
      setIsLoadingKids(false);
    }
  };

  const fetchTransactions = async (selectedKidIdForFilter?: string) => {
    setIsLoadingTransactions(true);
    try {
      const filterId = selectedKidIdForFilter !== undefined 
        ? selectedKidIdForFilter 
        : (historyFilter === "ALL" ? "" : historyFilter);
        
      const res = await fetch(`/api/transactions?kidId=${filterId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch (e) {
      console.error("Error fetching transactions:", e);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setPin("");
    setPinError(null);
    setIsShaking(false);
  };

  const handleBackToProfiles = () => {
    setSelectedProfile(null);
    setPin("");
    setPinError(null);
  };

  const handleKeypadPress = (val: string) => {
    if (isLoggingIn) return;
    setPinError(null);

    if (val === "DELETE") {
      setPin(prev => prev.slice(0, -1));
      return;
    }

    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      
      // Auto-submit when 4 digits are typed
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const submitPin = async (completedPin: string) => {
    if (!selectedProfile) return;
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedProfile.id, passcode: completedPin }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        await checkSession();
        setSelectedProfile(null);
        setPin("");
      } else {
        triggerPinError(data.error || "Incorrect passcode");
      }
    } catch (e) {
      triggerPinError("Login failed. Try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const triggerPinError = (message: string) => {
    setPinError(message);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
    }, 500);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
      setSelectedKid(null);
      setTransactions([]);
      setKids([]);
      setHistoryFilter("ALL");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const handleQuickAdjust = (val: number) => {
    setAmount(val.toString());
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKid || !amount || !description) return;
    
    setIsSubmittingTransaction(true);
    setTransactionError(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidId: selectedKid.id,
          amount: parseInt(amount, 10),
          description: description,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Success
        setAmount("");
        setDescription("");
        
        // Refresh local data to show updated balances
        await fetchKids();
        await fetchTransactions();
      } else {
        setTransactionError(data.error || "Failed to record score");
      }
    } catch (err) {
      setTransactionError("Server error. Please try again.");
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleAddKid = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddKidError(null);
    setIsCreatingKid(true);

    if (!newKidName || !newKidPin) {
      setAddKidError("Please fill in all fields.");
      setIsCreatingKid(false);
      return;
    }

    try {
      const res = await fetch("/api/kids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKidName,
          passcode: newKidPin,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewKidName("");
        setNewKidPin("");
        setIsAddingKid(false);
        fetchKids();
      } else {
        setAddKidError(data.error || "Failed to create kid profile.");
      }
    } catch (err) {
      setAddKidError("Server error. Please try again.");
    } finally {
      setIsCreatingKid(false);
    }
  };

  const handleDeleteKid = async (kidId: string, kidName: string) => {
    if (!confirm(`Are you sure you want to delete ${kidName}'s profile? All their score history will be lost permanently.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/kids?id=${kidId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (selectedKid?.id === kidId) {
          setSelectedKid(null);
        }
        fetchKids();
        fetchTransactions();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete kid profile.");
      }
    } catch (e) {
      alert("Error occurred deleting kid profile.");
    }
  };

  const handleFilterChange = (kidId: string) => {
    setHistoryFilter(kidId);
    fetchTransactions(kidId === "ALL" ? "" : kidId);
  };

  // Keyboard navigation support for PIN keypad
  useEffect(() => {
    if (!selectedProfile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoggingIn) return;
      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeypadPress("DELETE");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProfile, pin, isLoggingIn]);

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (d.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
    }
  };

  // UI Views

  if (isLoadingSession) {
    return (
      <div className="main-wrapper">
        <div className="spinner-container">
          <div className="spinner" />
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>Loading Daily Stars...</h2>
        </div>
      </div>
    );
  }

  // Logged Out Screen
  if (!session) {
    return (
      <div className="main-wrapper">
        <div className="container animate-fade-in" style={{ maxWidth: "600px" }}>
          {!selectedProfile ? (
            // Select Profile Panel
            <div className="glass-card" style={{ textAlign: "center" }}>
              <h1 className="profiles-title">🌟 Daily Stars</h1>
              <p style={{ color: "var(--text-secondary)", marginBottom: "40px", fontSize: "1.1rem" }}>
                Who is logging in today?
              </p>
              
              {profiles.length === 0 ? (
                <div className="empty-state">
                  No profiles found. Running seed script is recommended.
                </div>
              ) : (
                <div className="profiles-grid">
                  {profiles.map(profile => (
                    <button
                      key={profile.id}
                      className="profile-card"
                      onClick={() => handleSelectProfile(profile)}
                    >
                      <div className={`profile-avatar ${profile.role.toLowerCase()}`}>
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="profile-name">{profile.name}</span>
                      <span className="profile-role">{profile.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // PIN Entry Panel
            <div className={`glass-card pin-container ${isShaking ? "shake" : ""}`}>
              <div className="pin-header">
                <div className={`pin-avatar ${selectedProfile.role.toLowerCase()}`}>
                  {selectedProfile.name.charAt(0).toUpperCase()}
                </div>
                <h2>Enter passcode for {selectedProfile.name}</h2>
                <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
                  Please enter your 4-digit PIN
                </p>
              </div>

              {/* PIN Code Dots indicator */}
              <div className="pin-dots">
                <div className={`pin-dot ${pin.length >= 1 ? "filled" : ""}`} />
                <div className={`pin-dot ${pin.length >= 2 ? "filled" : ""}`} />
                <div className={`pin-dot ${pin.length >= 3 ? "filled" : ""}`} />
                <div className={`pin-dot ${pin.length >= 4 ? "filled" : ""}`} />
              </div>

              {pinError && (
                <div style={{ color: "#fb7185", fontWeight: "600", marginBottom: "20px" }}>
                  {pinError}
                </div>
              )}

              {/* PIN Keypad Grid */}
              <div className="pin-keypad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
                  <button
                    key={num}
                    className="pin-key"
                    onClick={() => handleKeypadPress(num)}
                    disabled={isLoggingIn}
                  >
                    {num}
                  </button>
                ))}
                
                <button 
                  className="pin-key action" 
                  onClick={handleBackToProfiles}
                  disabled={isLoggingIn}
                >
                  Back
                </button>
                
                <button
                  className="pin-key"
                  onClick={() => handleKeypadPress("0")}
                  disabled={isLoggingIn}
                >
                  0
                </button>
                
                <button
                  className="pin-key action"
                  onClick={() => handleKeypadPress("DELETE")}
                  disabled={isLoggingIn || pin.length === 0}
                  style={{ color: "#a29dbf" }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Logged In Views
  return (
    <div>
      {/* Universal Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-container">
            <span style={{ fontSize: "1.8rem" }}>🌟</span>
            <span className="logo-text">Daily Stars</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div className="user-badge">
              <div className={`user-badge-avatar ${session.role.toLowerCase()}`}>
                {session.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-badge-name">{session.name}</span>
              <span className="profile-role" style={{ fontSize: "0.65rem", marginLeft: "4px" }}>
                {session.role}
              </span>
            </div>
            
            <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: "8px 14px", fontSize: "0.9rem" }}>
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container animate-fade-in" style={{ padding: "0 20px 50px" }}>
        
        {session.role === "ADMIN" ? (
          // ================= ADMIN DASHBOARD =================
          <div>
            <div className="admin-grid">
              
              {/* Left Column: Kids list */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="flex-between">
                  <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={20} style={{ color: "var(--accent-purple)" }} />
                    Profiles & Balances
                  </h2>
                  
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setIsAddingKid(!isAddingKid)}
                    style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  >
                    <Plus size={16} />
                    <span>New Profile</span>
                  </button>
                </div>

                {isAddingKid && (
                  <form onSubmit={handleAddKid} className="add-kid-panel">
                    <h3 style={{ fontSize: "1rem", marginBottom: "15px", color: "var(--text-primary)" }}>Add New Kid Profile</h3>
                    {addKidError && (
                      <p style={{ color: "#fb7185", fontSize: "0.85rem", marginBottom: "12px", fontWeight: "600" }}>{addKidError}</p>
                    )}
                    
                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Kid's Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Leo" 
                        value={newKidName}
                        onChange={(e) => setNewKidName(e.target.value)}
                        className="form-input"
                        style={{ padding: "10px 12px", fontSize: "0.95rem" }}
                        required
                      />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>4-Digit Login PIN</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 5678" 
                        maxLength={4}
                        pattern="\d{4}"
                        value={newKidPin}
                        onChange={(e) => setNewKidPin(e.target.value.replace(/\D/g, ""))}
                        className="form-input"
                        style={{ padding: "10px 12px", fontSize: "0.95rem" }}
                        required
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={isCreatingKid}
                        style={{ flex: 1, padding: "8px 12px", fontSize: "0.9rem" }}
                      >
                        {isCreatingKid ? "Creating..." : "Save Kid"}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setIsAddingKid(false);
                          setAddKidError(null);
                        }}
                        style={{ padding: "8px 12px", fontSize: "0.9rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {isLoadingKids && kids.length === 0 ? (
                  <div className="spinner-container" style={{ padding: "30px 0" }}>
                    <div className="spinner" style={{ width: "30px", height: "30px" }} />
                  </div>
                ) : kids.length === 0 ? (
                  <div className="empty-state">
                    No kid profiles found. Add one above!
                  </div>
                ) : (
                  <div className="kids-list">
                    {kids.map(kid => (
                      <div 
                        key={kid.id} 
                        className={`kid-row-card ${selectedKid?.id === kid.id ? "selected" : ""}`}
                        onClick={() => setSelectedKid(kid)}
                      >
                        <div className="kid-row-info">
                          <div className="kid-row-avatar">
                            {kid.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="kid-row-name">{kid.name}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="kid-row-balance">
                            <span>🌟</span>
                            <span className="kid-row-stars-val">{kid.balance ?? 0}</span>
                          </div>
                          
                          <button 
                            className="delete-profile-btn" 
                            title="Delete profile"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteKid(kid.id, kid.name);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Manage Score form */}
              <div className="glass-card">
                {selectedKid ? (
                  <form onSubmit={handleRecordTransaction}>
                    <h2 style={{ fontSize: "1.3rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Star size={20} style={{ color: "#facc15" }} />
                      Manage Stars for {selectedKid.name}
                    </h2>

                    {transactionError && (
                      <p style={{ color: "#fb7185", fontWeight: "600", marginBottom: "15px", fontSize: "0.9rem" }}>{transactionError}</p>
                    )}

                    <div className="form-group">
                      <label className="form-label">Quick Adjustments</label>
                      <div className="quick-adjust-grid">
                        <button type="button" onClick={() => handleQuickAdjust(1)} className="adjust-btn plus">+1 Star</button>
                        <button type="button" onClick={() => handleQuickAdjust(5)} className="adjust-btn plus">+5 Stars</button>
                        <button type="button" onClick={() => handleQuickAdjust(10)} className="adjust-btn plus">+10 Stars</button>
                        <button type="button" onClick={() => handleQuickAdjust(-1)} className="adjust-btn minus">-1 Star</button>
                        <button type="button" onClick={() => handleQuickAdjust(-5)} className="adjust-btn minus">-5 Stars</button>
                        <button type="button" onClick={() => handleQuickAdjust(-10)} className="adjust-btn minus">-10 Stars</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="amount-input">Custom Star Change</label>
                      <input 
                        id="amount-input"
                        type="number" 
                        placeholder="Use negative numbers to subtract (e.g. -5)" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="description-input">Description / Reason</label>
                      <input 
                        id="description-input"
                        type="text" 
                        placeholder="e.g. Cleaned room, finished homework, helper" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      className={`btn btn-primary`}
                      disabled={isSubmittingTransaction || !amount || !description}
                      style={{ width: "100%", marginTop: "10px" }}
                    >
                      {isSubmittingTransaction ? "Saving..." : "Record Score Adjustment"}
                    </button>
                  </form>
                ) : (
                  <div className="empty-state" style={{ padding: "60px 0" }}>
                    Select a kid profile on the left to award or subtract stars.
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Section: Transaction Logs for Admin */}
            <div className="glass-card">
              <div className="flex-between history-section-header">
                <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <History size={20} style={{ color: "var(--accent-pink)" }} />
                  Recent Score Adjustments
                </h2>
                
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>Filter:</span>
                  <select 
                    value={historyFilter} 
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="form-select"
                    style={{ padding: "6px 36px 6px 12px", fontSize: "0.85rem" }}
                  >
                    <option value="ALL">All Kids</option>
                    {kids.map(kid => (
                      <option key={kid.id} value={kid.id}>{kid.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoadingTransactions && transactions.length === 0 ? (
                <div className="spinner-container" style={{ padding: "40px 0" }}>
                  <div className="spinner" style={{ width: "30px", height: "30px" }} />
                </div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  No score transactions logged yet.
                </div>
              ) : (
                <div className="transaction-list">
                  {transactions.map(tx => (
                    <div key={tx.id} className="transaction-item">
                      <div className="transaction-item-left">
                        <span className="transaction-desc">{tx.description}</span>
                        <div className="transaction-meta">
                          <span className="badge badge-gold" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                            {tx.user?.name}
                          </span>
                          <span className="transaction-dot" />
                          <span>{formatDate(tx.createdAt)}</span>
                          <span className="transaction-dot" />
                          <span style={{ opacity: 0.8 }}>by {tx.createdBy?.name}</span>
                        </div>
                      </div>
                      
                      <div className={`transaction-amount-badge ${tx.amount > 0 ? "positive" : "negative"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                        <span style={{ fontSize: "1.1rem" }}>🌟</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // ================= KID DASHBOARD =================
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            
            {/* Balance Overview Hero Card */}
            <div className="glass-card stars-hero-card">
              <div className="stars-spinning-icon">🌟</div>
              <h1 className="balance-count">{session.balance ?? 0}</h1>
              <div className="balance-label">Total Stars</div>
              <p className="balance-subtext">
                Great job, {session.name}! Keep up the excellent work to earn more stars!
              </p>
            </div>

            {/* Score Logs */}
            <div className="glass-card">
              <div className="flex-between history-section-header">
                <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <History size={20} style={{ color: "var(--accent-pink)" }} />
                  My Star History Log
                </h2>
                
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    checkSession(); // Refreshes session details (balance)
                    fetchTransactions(); // Refreshes transaction list
                  }}
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingTransactions && transactions.length === 0 ? (
                <div className="spinner-container" style={{ padding: "40px 0" }}>
                  <div className="spinner" style={{ width: "30px", height: "30px" }} />
                </div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  No stars earned yet. Ask Dad for task stars!
                </div>
              ) : (
                <div className="transaction-list">
                  {transactions.map(tx => (
                    <div key={tx.id} className="transaction-item">
                      <div className="transaction-item-left">
                        <span className="transaction-desc" style={{ fontSize: "1.05rem" }}>{tx.description}</span>
                        <div className="transaction-meta">
                          <span>{formatDate(tx.createdAt)}</span>
                          <span className="transaction-dot" />
                          <span style={{ opacity: 0.8 }}>Awarded by {tx.createdBy?.name}</span>
                        </div>
                      </div>
                      
                      <div className={`transaction-amount-badge ${tx.amount > 0 ? "positive" : "negative"}`} style={{ fontSize: "1.3rem" }}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                        <span>🌟</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
