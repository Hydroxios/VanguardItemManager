"use client"

import Image from "next/image";
import Loader from "./Loader";
import { getSettings, NOTIFICATION_DURATION_FACTORS } from "@/lib/hooks/useSettings";
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

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

// Notifications stay up longer or shorter than asked, as set
const displayDuration = (duration: number) => duration * NOTIFICATION_DURATION_FACTORS[getSettings().notificationDuration];

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Incrementing ids: Date.now() collides when two notifications are created in the same millisecond
  const nextId = useRef(1);

  const addNotification = useCallback((message: string, description: string = "", type: "info" | "success" | "error" | "warning" = "info", icon: string = "", duration: number = 3000, loading: boolean = false) => {
    const id = nextId.current++;
    setNotifications((prev) => [...prev, { id, message, description, type, icon, loading }]);

    if (!loading) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      }, displayDuration(duration));
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
      }, displayDuration(duration));
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
                  <Loader size={32} />
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
