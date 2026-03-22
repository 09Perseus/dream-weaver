import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import RoomView from "./pages/RoomView";
import EditRoom from "./pages/EditRoom";
import Community from "./pages/Community";
import MyRooms from "./pages/MyRooms";
import Cart from "./pages/Cart";
import OrderConfirmation from "./pages/OrderConfirmation";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import Orders from "./pages/Orders";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = React.forwardRef<HTMLDivElement>((_, ref) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
        <CurrencyProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Layout ref={ref}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/room/new" element={<EditRoom />} />
                <Route path="/room/:id" element={<RoomView />} />
                <Route path="/room/:id/edit" element={<EditRoom />} />
                <Route path="/community" element={<Community />} />
                <Route
                  path="/my-rooms"
                  element={
                    <RequireAuth>
                      <MyRooms />
                    </RequireAuth>
                  }
                />
                <Route path="/cart" element={<Cart />} />
                <Route
                  path="/orders"
                  element={
                    <RequireAuth>
                      <Orders />
                    </RequireAuth>
                  }
                />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </CartProvider>
        </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
));

App.displayName = "App";

export default App;
