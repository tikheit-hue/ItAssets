
"use client";

import { useCompanyInfo } from '@/context/company-info-context';
import type { Employee } from '@/app/employees/index';
import type { Award } from '@/app/awards/page';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';

type AwardCertificateProps = {
    award: Award;
    employee: Employee;
};

// A simple, elegant certificate design
export function AwardCertificate({ award, employee }: AwardCertificateProps) {
    const { companyInfo } = useCompanyInfo();

    return (
        <div style={styles.page}>
            <div style={styles.border}>
                <div style={styles.container}>
                    <div style={styles.header}>
                        {companyInfo.logo && <Image src={companyInfo.logo} alt="Company Logo" width={100} height={100} style={styles.logo} />}
                        <h1 style={styles.companyName}>{companyInfo.name || 'Your Company'}</h1>
                    </div>

                    <div style={styles.mainContent}>
                        <h2 style={styles.certificateTitle}>Certificate of Appreciation</h2>
                        <p style={styles.bodyText}>This certificate is proudly presented to</p>
                        <h3 style={styles.employeeName}>{employee.name}</h3>
                        <p style={styles.bodyText}>for outstanding performance and dedication in recognition of the</p>
                        <h4 style={styles.awardName}>{award.name}</h4>
                        <p style={styles.bodyText}>Awarded on this day, {format(parseISO(award.awardDate), 'do MMMM, yyyy')}.</p>
                        <p style={{...styles.bodyText, ...styles.reasonText}}>"{award.reason}"</p>
                    </div>
                    
                    <div style={styles.footer}>
                        <div style={styles.signature}>
                            <p style={styles.signatureLine}></p>
                            <p style={styles.signatureText}>{award.awardedBy}</p>
                        </div>
                        <div style={styles.signature}>
                            <p style={styles.signatureLine}></p>
                            <p style={styles.signatureText}>Authorised Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        width: '297mm',
        height: '210mm',
        backgroundColor: '#f9f9f9',
        fontFamily: "'Times New Roman', Times, serif",
        color: '#333',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
    },
    border: {
        width: 'calc(100% - 20px)',
        height: 'calc(100% - 20px)',
        border: '2px solid #bda16b',
        padding: '5px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    },
    container: {
        width: '100%',
        height: '100%',
        border: '1px solid #bda16b',
        padding: '20px 40px',
        boxSizing: 'border-box',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexShrink: 0,
    },
    logo: {
        maxHeight: '50px',
        width: 'auto',
        marginBottom: '10px',
        marginLeft: 'auto',
        marginRight: 'auto'
    },
    companyName: {
        fontSize: '24pt',
        fontWeight: 'bold',
        color: '#bda16b',
        margin: 0,
    },
    mainContent: {
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '20px 0',
    },
    certificateTitle: {
        fontSize: '28pt',
        margin: '10px 0',
        color: '#444',
    },
    bodyText: {
        fontSize: '12pt',
        margin: '5px 0',
    },
    reasonText: {
        fontStyle: 'italic',
        marginTop: '15px',
        color: '#555',
        maxWidth: '80%',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    employeeName: {
        fontSize: '36pt',
        fontFamily: "'Brush Script MT', cursive",
        color: '#bda16b',
        margin: '15px 0',
    },
    awardName: {
        fontSize: '20pt',
        fontWeight: 'bold',
        margin: '10px 0',
    },
    footer: {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        paddingTop: '20px',
        marginTop: 'auto',
        flexShrink: 0,
    },
    signature: {
        width: '40%',
    },
    signatureLine: {
        borderTop: '1px solid #333',
        margin: '0',
    },
    signatureText: {
        fontSize: '10pt',
        marginTop: '5px',
        marginBlock: 0,
    },
};
