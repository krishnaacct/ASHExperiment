
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { toast } from '../ui/Toast';
import { Shield, Clock } from 'lucide-react';
import { SplitInput } from '../ui/SplitInput';
import * as api from '../../services/apiService';
import { ICONS } from '../dashboard/modules';
import { applyTheme } from '../../utils/theme';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { SkeletonLoader } from '../ui/SkeletonLoader';

const Login: React.FC = () => {
    const [mobileNumber, setMobileNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isBrandingLoading, setIsBrandingLoading] = useState(true);
    const { requestOtp, login } = useAuth();
    const [logoError, setLogoError] = useState(false);
    
    // Rate Limiting State
    const [cooldown, setCooldown] = useState(0);

    // State for dynamic branding and configuration
    const [branding, setBranding] = useState<{
        name: string;
        tagline: string;
        icon: React.ReactElement<any>;
        iconUrl: string;
        clientCooldown: number; // For successful requests
        lockoutMinutes: number; // For "Too many requests" error
    }>({
        name: 'Audit Portal',
        tagline: '',
        icon: <Shield />,
        iconUrl: './logo192.png',
        clientCooldown: 60, // Default fallback
        lockoutMinutes: 10 // Default fallback
    });

    useEffect(() => {
        const fetchBranding = async () => {
            setIsBrandingLoading(true);
            try {
                const data = await api.getPublicBranding();
                // @ts-ignore - Types might not be updated immediately
                const clientCooldownVal = parseInt(data.securityClientCooldownSeconds || '60', 10);
                // @ts-ignore
                const lockoutMinutesVal = parseInt(data.securityLockoutMinutes || '10', 10);
                
                const iconComponent = ICONS[data.appIcon] || <Shield />;
                setBranding({
                    name: data.appName,
                    tagline: data.appTagline,
                    icon: iconComponent,
                    iconUrl: data.appIconUrl || './logo192.png',
                    clientCooldown: isNaN(clientCooldownVal) ? 60 : clientCooldownVal,
                    lockoutMinutes: isNaN(lockoutMinutesVal) ? 10 : lockoutMinutesVal
                });

                const primaryColor = data.primaryColor || '#3b82f6';
                applyTheme(primaryColor);
                localStorage.setItem('primaryColor', primaryColor);

            } catch (error) {
                console.error("Failed to fetch public branding:", error);
                setBranding({
                    name: 'Audit Portal',
                    tagline: 'Audit & Compliance Management System',
                    icon: <Shield />,
                    iconUrl: './logo192.png',
                    clientCooldown: 60,
                    lockoutMinutes: 10
                });
                applyTheme('#3b82f6');
            } finally {
                setIsBrandingLoading(false);
            }
        };
        fetchBranding();
        
        // Check for existing cooldown on mount
        checkCooldown();
    }, []);

    // Timer Logic - Updated to use absolute time to handle browser throttling/background tabs
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (cooldown > 0) {
            timer = setInterval(() => {
                const storedEndTime = localStorage.getItem('otpCooldownUntil');
                if (storedEndTime) {
                    const end = parseInt(storedEndTime, 10);
                    const now = Date.now();
                    const remaining = Math.ceil((end - now) / 1000);

                    if (remaining <= 0) {
                        setCooldown(0);
                        localStorage.removeItem('otpCooldownUntil');
                    } else {
                        setCooldown(remaining);
                    }
                } else {
                    // Fallback if storage is cleared manually
                    setCooldown(0);
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const checkCooldown = () => {
        const storedEndTime = localStorage.getItem('otpCooldownUntil');
        if (storedEndTime) {
            const remaining = Math.ceil((parseInt(storedEndTime) - Date.now()) / 1000);
            if (remaining > 0) {
                setCooldown(remaining);
            } else {
                localStorage.removeItem('otpCooldownUntil');
            }
        }
    };

    const startCooldown = (seconds: number) => {
        if (seconds <= 0) {
            localStorage.removeItem('otpCooldownUntil');
            setCooldown(0);
            return;
        }
        const endTime = Date.now() + (seconds * 1000);
        localStorage.setItem('otpCooldownUntil', endTime.toString());
        setCooldown(seconds);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mobileNumber.length !== 10) {
            toast('Please enter a valid 10-digit mobile number.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const success = await requestOtp(mobileNumber);
            if (success) {
                setStep(2);
                toast('OTP has been sent to your Telegram.', 'success');
                // Use the configurable cooldown from backend settings
                startCooldown(branding.clientCooldown); 
            } else {
                toast('Failed to send OTP. Please check your mobile number.', 'error');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast(errorMessage, 'error');
            
            // Critical: If server says "Too many requests", lock the UI for the configured lockout duration
            if (errorMessage.includes("Too many OTP requests")) {
                 startCooldown(branding.lockoutMinutes * 60); 
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast('Please enter the 6-digit OTP.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await login(mobileNumber, otp);
            toast('Login successful!', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast(errorMessage, 'error');
            
            if (errorMessage.includes('Maximum attempts reached') || errorMessage.includes('expired')) {
                setTimeout(() => {
                    handleReturnToStep1();
                }, 2500);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReturnToStep1 = () => {
        setStep(1);
        // Do not clear mobile number so they can easily retry
        setOtp('');
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
            <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center">
                {/* --- Branding Column --- */}
                <div className="w-full sm:w-1/2 lg:w-2/5 p-8 flex flex-col items-center justify-center text-center">
                    <div className="mx-auto bg-[var(--primary-color)] rounded-full p-3 w-28 h-28 flex items-center justify-center mb-4 ring-4 ring-[var(--card-background)] shadow-lg transition-colors duration-500 overflow-hidden">
                        {isBrandingLoading ? (
                            <SkeletonLoader className="h-20 w-20 rounded-full" />
                        ) : branding.iconUrl && !logoError ? (
                            <img 
                                src={branding.iconUrl} 
                                alt="App Logo" 
                                className="h-full w-full object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            React.cloneElement(branding.icon, { className: "h-16 w-16 text-[var(--primary-foreground)]" })
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">
                        {isBrandingLoading ? (
                            <SkeletonLoader className="h-8 w-48 mx-auto" />
                        ) : step === 1 ? (
                            <span>
                                {branding.name}
                                <br />
                                <span className="text-xl font-medium text-[var(--foreground-muted)]">{branding.tagline}</span>
                            </span>
                        ) : 'Enter OTP'}
                    </h1>
                    <div className="text-[var(--foreground-muted)] mt-2 max-w-sm">
                        {isBrandingLoading ? (
                            <SkeletonLoader className="h-4 w-64 mx-auto mt-4" />
                        ) : step === 1 
                            ? 'To Login, enter your mobile number and get OTP on Telegram.'
                            : `An OTP was sent to the Telegram account for ${mobileNumber}`
                        }
                    </div>
                </div>

                {/* --- Form Column --- */}
                <div className="w-full sm:w-1/2 lg:w-3/5 mt-6 sm:mt-0">
                    {isBrandingLoading ? (
                        <WorkstationSkeleton type="form" />
                    ) : (
                        <Card className="shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-500">
                            {step === 1 && (
                                <form className="space-y-6" onSubmit={handleRequestOtp}>
                                    <SplitInput
                                        length={10}
                                        value={mobileNumber}
                                        onChange={setMobileNumber}
                                        label="Mobile Number"
                                        variant="unified"
                                        autoFocus={true}
                                    />
                                    <Button 
                                        type="submit" 
                                        className="w-full" 
                                        isLoading={isLoading} 
                                        size="lg"
                                        disabled={cooldown > 0}
                                    >
                                        {cooldown > 0 ? (
                                            <span className="flex items-center">
                                                <Clock className="w-4 h-4 mr-2" /> 
                                                Wait {formatTime(cooldown)}
                                            </span>
                                        ) : 'Request OTP'}
                                    </Button>
                                    {cooldown > 0 && (
                                        <p className="text-xs text-center text-[var(--foreground-muted)]">
                                            Please wait before requesting another OTP.
                                        </p>
                                    )}
                                </form>
                            )}
                            {step === 2 && (
                                <form className="space-y-6" onSubmit={handleLogin}>
                                    <SplitInput
                                        length={6}
                                        value={otp}
                                        onChange={setOtp}
                                        label="One-Time Password (OTP)"
                                        colorize={true}
                                        variant="split"
                                        autoFocus={true}
                                    />
                                    <div className="flex flex-col space-y-3">
                                        <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                                            Sign In
                                        </Button>

                                        <Button type="button" variant="secondary" onClick={handleReturnToStep1} disabled={isLoading} className="w-full">
                                            Use a different number
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
