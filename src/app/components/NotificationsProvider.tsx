"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Notification = {
  id: number;
  message: string;
  description?: string;
  type?: "info" | "success" | "error";
  icon?: string;
};

type NotificationsContextType = {
  addNotification: (message: string, description? :string, type?: "info" | "success" | "error", icon? :string, duration?: number) => void;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, description :string = "" , type: "info" | "success" | "error" = "info", icon :string = "", duration: number = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, description, type, icon }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    }, duration);
  }, []);

  return (
    <NotificationsContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-10 right-5 flex flex-col gap-3 z-[9999]">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`px-4 py-2 shadow-lg text-white bg-black bg-opacity-75 border-t-2 ${
              notif.type === "success" ? "border-green-500" :
              notif.type === "error" ? "border-red-500" :
              "border-blue-500"
            }`}
          >
            <div className="flex flex-row gap-2 items-center">
                <div>
                    {notif.icon && (
                        <img src={notif.icon} height={32} width={32}/>
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
