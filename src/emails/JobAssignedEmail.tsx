import * as React from 'react'
import { Html, Head, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components'

interface JobAssignedEmailProps {
  technicianName: string
  customerName: string
  address: string
  scheduledDate: string
  scheduledTime: string
  jobType: string
  notes: string
  contactPhone: string
  jobId: string
  jobLink: string
}

export const JobAssignedEmail = ({
  technicianName = 'Mike Johnson',
  customerName = 'John Doe',
  address = '123 Main St, Anytown, ST 12345',
  scheduledDate = 'January 15, 2025',
  scheduledTime = '2:00 PM',
  jobType = 'Plumbing Repair',
  notes = 'Customer requests arrival between 2-4 PM. Call before arriving.',
  contactPhone = '(555) 123-4567',
  jobId = 'JOB-001',
  jobLink = 'https://fieldgenie.app/jobs/123',
}: JobAssignedEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerIcon}>📋</Text>
          <Text style={headerTitle}>New Job Assigned</Text>
        </Section>

        {/* Greeting */}
        <Section style={content}>
          <Text style={greeting}>Hi {technicianName},</Text>
          <Text style={paragraph}>
            You’ve been assigned a new job. Here are the details:
          </Text>

          {/* Job ID Badge */}
          <Section style={jobBadge}>
            <Text style={jobBadgeLabel}>Job ID:</Text>
            <Text style={jobBadgeValue}>{jobId}</Text>
          </Section>

          {/* Schedule Section */}
          <Section style={scheduleBox}>
            <Text style={scheduleIcon}>📅</Text>
            <Text style={scheduleLabel}>Scheduled For</Text>
            <Text style={scheduleDate}>{scheduledDate}</Text>
            <Text style={scheduleTime}>{scheduledTime}</Text>
          </Section>

          {/* Customer Details */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Customer Information</Text>
            
            <Section style={detailRow}>
              <Text style={detailLabel}>Name:</Text>
              <Text style={detailValue}>{customerName}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Address:</Text>
              <Link 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                style={addressLink}
              >
                {address}
              </Link>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Phone:</Text>
              <Link href={`tel:${contactPhone}`} style={phoneLink}>
                {contactPhone}
              </Link>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Job Type:</Text>
              <Text style={detailValue}>{jobType}</Text>
            </Section>
          </Section>

          {/* Special Notes */}
          {notes && (
            <Section style={notesBox}>
              <Text style={notesTitle}>⚠️ Special Notes</Text>
              <Text style={notesText}>{notes}</Text>
            </Section>
          )}

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={jobLink} style={button}>
              View Full Job Details
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={helpText}>
            Need to make changes? Contact dispatch at (555) 100-0000
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Field Genie © {new Date().getFullYear()}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

// Styles
const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#7c3aed',
  backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  padding: '32px 24px',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
}

const headerIcon = {
  fontSize: '48px',
  margin: '0 0 8px 0',
}

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '32px 24px',
  borderRadius: '0 0 12px 12px',
}

const greeting = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px 0',
}

const jobBadge = {
  backgroundColor: '#ede9fe',
  border: '2px solid #8b5cf6',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
}

const jobBadgeLabel = {
  color: '#7c3aed',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px 0',
}

const jobBadgeValue = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
}

const scheduleBox = {
  backgroundColor: '#dbeafe',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
}

const scheduleIcon = {
  fontSize: '32px',
  margin: '0 0 8px 0',
}

const scheduleLabel = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
}

const scheduleDate = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
}

const scheduleTime = {
  color: '#3b82f6',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
}

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px 0',
}

const detailsTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '8px',
}

const detailRow = {
  margin: '0 0 12px 0',
}

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px 0',
}

const detailValue = {
  color: '#1f2937',
  fontSize: '15px',
  margin: '0',
}

const addressLink = {
  color: '#3b82f6',
  fontSize: '15px',
  textDecoration: 'none',
  display: 'block',
  margin: '0',
}

const phoneLink = {
  color: '#3b82f6',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'block',
  margin: '0',
}

const notesBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px 0',
}

const notesTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const notesText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#8b5cf6',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0 0 0',
}

const footer = {
  textAlign: 'center' as const,
  padding: '24px 0',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '4px 0',
}

export default JobAssignedEmail
