"use client"

import Image from "next/image";
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Notification = {
  id: number;
  message: string;
  description?: string;
  type?: "info" | "success" | "error" | "warning";
  icon?: string;
  loading?: boolean;
};

type NotificationsContextType = {
  addNotification: (message: string, description?: string, type?: "info" | "success" | "error" | "warning", icon?: string, duration?: number, loading?: boolean) => number;
  updateNotification: (id: number, message: string, description?: string, type?: "info" | "success" | "error" | "warning", icon?: string, duration?: number, loading?: boolean) => void;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, description: string = "", type: "info" | "success" | "error" | "warning" = "info", icon: string = "", duration: number = 3000, loading: boolean = false) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, description, type, icon, loading }]);

    if (!loading) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const updateNotification = useCallback((id: number, message: string, description: string = "", type: "info" | "success" | "error" | "warning" = "info", icon: string = "", duration: number = 3000, loading: boolean = false) => {
    setNotifications((prev) => prev.map((notif) => {
      if (notif.id === id) {
        return { ...notif, message, description, type, icon, loading };
      }
      return notif;
    }));

    if (!loading) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      }, duration);
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ addNotification, updateNotification }}>
      {children}
      <div className="fixed bottom-10 right-5 flex flex-col gap-3 z-[9999]">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`px-4 py-2 shadow-lg text-white bg-black bg-opacity-75 border-t-2 ${notif.type === "success" ? "border-green-500" :
              notif.type === "error" ? "border-red-500" :
                "border-indigo-700"
              }`}
          >
            <div className="flex flex-row gap-2 items-center">
              <div>
                {notif.loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white p-4"></div>
                ) : (
                  notif.icon && (
                    <Image src={notif.icon} height={32} width={32} alt="Notification icon" />
                  )
                )}
              </div>
              <div className="flex flex-col">
                <div>{notif.message}</div>
                {notif.description && (
                  <div>{notif.description}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications doit être utilisé dans un NotificationsProvider");
  return context;
};
