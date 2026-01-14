import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Platform,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';

const AboutHousewayScreen = ({ navigation }) => {
    const openLink = (url) => {
        Linking.openURL(url).catch(err => console.error('Error opening link:', err));
    };

    const contactInfo = [
        {
            icon: 'map-pin',
            label: 'Address',
            value: '3-38/A/1, Korremula Main Road,\nNarapally, Hyderabad,\nTelangana, 500088',
            action: () => openLink('https://maps.app.goo.gl/jGZR9znrpDbNxTxt7'),
        },
        {
            icon: 'phone',
            label: 'Phone',
            value: '+91 9391767771',
            action: () => openLink('tel:+919391767771'),
        },
        {
            icon: 'mail',
            label: 'Email',
            value: 'contact@houseway.co.in',
            action: () => openLink('mailto:contact@houseway.co.in'),
        },
        {
            icon: 'globe',
            label: 'Website',
            value: 'houseway.co.in',
            action: () => openLink('https://houseway.co.in'),
        },
    ];

    const services = [
        { icon: 'home', name: 'Interior Designing' },
        { icon: 'tool', name: 'Renovation & Remodelling' },
        { icon: 'zap', name: 'Electrical & Plumbing' },
        { icon: 'droplet', name: 'Painting & Wallpapers' },
        { icon: 'package', name: 'Packaging & Moving' },
    ];

    const socialLinks = [
        { icon: 'facebook', url: 'https://www.facebook.com/houseway.co', color: '#1877F2' },
        { icon: 'instagram', url: 'https://www.instagram.com/houseway_co.in', color: '#E4405F' },
        { icon: 'youtube', url: 'https://youtube.com/@housewayhyd', color: '#FF0000' },
        { icon: 'linkedin', url: 'https://www.linkedin.com/company/houseway-co/', color: '#0A66C2' },
    ];

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>About Houseway</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Logo & Tagline */}
                <View style={styles.logoSection}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>H</Text>
                    </View>
                    <Text style={styles.companyName}>Houseway</Text>
                    <Text style={styles.tagline}>"Your Home deserves Design!"</Text>
                </View>

                {/* About Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Who We Are</Text>
                    <Text style={styles.cardText}>
                        Houseway is a premier home design and construction company based in Hyderabad.
                        We specialize in transforming spaces into beautiful, functional homes through
                        innovative interior design, quality renovations, and comprehensive home services.
                    </Text>
                    <Text style={styles.cardText}>
                        "Some people look for a beautiful place, some make place beautiful" - that's our philosophy.
                    </Text>
                </View>

                {/* Services */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Our Services</Text>
                    <View style={styles.servicesGrid}>
                        {services.map((service, index) => (
                            <View key={index} style={styles.serviceItem}>
                                <View style={styles.serviceIcon}>
                                    <Feather name={service.icon} size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.serviceName}>{service.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Contact Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Contact Us</Text>
                    {contactInfo.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.contactRow} onPress={item.action}>
                            <View style={styles.contactIcon}>
                                <Feather name={item.icon} size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.contactContent}>
                                <Text style={styles.contactLabel}>{item.label}</Text>
                                <Text style={styles.contactValue}>{item.value}</Text>
                            </View>
                            <Feather name="external-link" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Social Links */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Follow Us</Text>
                    <View style={styles.socialRow}>
                        {socialLinks.map((social, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.socialBtn, { backgroundColor: social.color + '15' }]}
                                onPress={() => openLink(social.url)}
                            >
                                <Feather name={social.icon} size={22} color={social.color} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* App Version */}
                <View style={styles.versionSection}>
                    <Text style={styles.versionText}>Houseway App v1.0.0</Text>
                    <Text style={styles.copyrightText}>© 2024 Houseway. All rights reserved.</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    logoSection: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    logoText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#1F2937',
    },
    companyName: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    tagline: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    card: {
        backgroundColor: COLORS.cardBg,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    cardText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: 8,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    serviceIcon: {
        marginRight: 6,
    },
    serviceName: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.primary,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    contactIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactContent: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    versionSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    versionText: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    copyrightText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
});

export default AboutHousewayScreen;
