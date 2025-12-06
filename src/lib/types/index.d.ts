export interface DisplayPropertiesDefinition {
    name: string;
    description: string;
    icon: string;
    hasIcon: boolean;
}

export interface Alert {
    AlertKey: string
    AlertHtml: string
    AlertTimestamp: Date
    AlertLink: string
    AlertLevel: number
    AlertType: number
}
