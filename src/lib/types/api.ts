// Bungie.net platform types

export interface BungieUser {
    uniqueName: string
    membershipId: string
    membershipType: number
}

export interface UserInfo {
    displayName: string
    iconPath: string
    crossSaveOverride: number
    isPublic: boolean
    bungieGlobalDisplayNameCode: number
}

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
