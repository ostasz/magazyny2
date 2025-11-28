import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
    const [location, setLocation] = useLocation();
    const [activeTab, setActiveTab] = useState("login");

    // Login state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // Register state
    const [registerName, setRegisterName] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");

    const utils = trpc.useUtils();

    const loginMutation = trpc.auth.login.useMutation({
        onSuccess: async () => {
            toast.success("Zalogowano pomyślnie");
            await utils.auth.me.invalidate();
            setLocation("/");
        },
        onError: (error) => {
            toast.error(error.message || "Błąd logowania");
        },
    });

    const registerMutation = trpc.auth.register.useMutation({
        onSuccess: async () => {
            toast.success("Konto utworzone pomyślnie");
            await utils.auth.me.invalidate();
            setLocation("/");
        },
        onError: (error) => {
            toast.error(error.message || "Błąd rejestracji");
        },
    });

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ email: loginEmail, password: loginPassword });
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate({
            name: registerName,
            email: registerEmail,
            password: registerPassword
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Witaj w aplikacji</CardTitle>
                    <CardDescription>Zaloguj się lub utwórz nowe konto</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">Logowanie</TabsTrigger>
                            <TabsTrigger value="register">Rejestracja</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="twoj@email.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Hasło</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                                    {loginMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logowanie...
                                        </>
                                    ) : (
                                        "Zaloguj się"
                                    )}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="register-name">Imię</Label>
                                    <Input
                                        id="register-name"
                                        placeholder="Jan Kowalski"
                                        value={registerName}
                                        onChange={(e) => setRegisterName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="register-email">Email</Label>
                                    <Input
                                        id="register-email"
                                        type="email"
                                        placeholder="twoj@email.com"
                                        value={registerEmail}
                                        onChange={(e) => setRegisterEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="register-password">Hasło (min. 8 znaków)</Label>
                                    <Input
                                        id="register-password"
                                        type="password"
                                        value={registerPassword}
                                        onChange={(e) => setRegisterPassword(e.target.value)}
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                                    {registerMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rejestracja...
                                        </>
                                    ) : (
                                        "Utwórz konto"
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-gray-500">
                    Magazyn Rentowności &copy; {new Date().getFullYear()}
                </CardFooter>
            </Card>
        </div>
    );
}
