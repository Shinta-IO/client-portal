import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customer: {
    name: string;
    email: string;
    organization?: string;
    phone?: string;
  };
  company: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    amount: number; // in cents
  }>;
  subtotal: number; // in cents
  taxRate: number; // percentage
  taxAmount: number; // in cents
  total: number; // in cents
  notes?: string;
}

export class PDFService {
  private static instance: PDFService;

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  /**
   * Generate invoice PDF from HTML element
   */
  async generateInvoicePDFFromElement(element: HTMLElement, filename?: string): Promise<Blob> {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF from element:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF programmatically
   */
  async generateInvoicePDF(data: InvoiceData): Promise<Blob> {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colors
      const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
      const textColor: [number, number, number] = [55, 65, 81]; // Gray-700
      const lightGray: [number, number, number] = [243, 244, 246]; // Gray-100

      // Helper function to format currency
      const formatCurrency = (cents: number): string => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(cents / 100);
      };

      // Header
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(data.company.name || 'Pixel Pro', 20, 20);

      // Invoice title
      pdf.setTextColor(...textColor);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', 20, 50);

      // Invoice details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Invoice #: ${data.invoiceNumber}`, 20, 65);
      pdf.text(`Date: ${data.date}`, 20, 72);
      pdf.text(`Due Date: ${data.dueDate}`, 20, 79);

      // Company information
      pdf.setFont('helvetica', 'bold');
      pdf.text('From:', 120, 65);
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.company.name || 'Pixel Pro', 120, 72);
      pdf.text(data.company.email || 'contact@pixel-pro.org', 120, 79);
      if (data.company.phone) {
        pdf.text(data.company.phone, 120, 86);
      }
      if (data.company.address) {
        pdf.text(data.company.address, 120, 93);
      }

      // Customer information
      pdf.setFont('helvetica', 'bold');
      pdf.text('To:', 20, 105);
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.customer.name, 20, 112);
      pdf.text(data.customer.email, 20, 119);
      if (data.customer.organization) {
        pdf.text(data.customer.organization, 20, 126);
      }
      if (data.customer.phone) {
        pdf.text(data.customer.phone, 20, 133);
      }

      // Items table
      const startY = 150;
      let currentY = startY;

      // Table header
      pdf.setFillColor(...lightGray);
      pdf.rect(20, currentY, 170, 10, 'F');
      
      pdf.setTextColor(...textColor);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description', 25, currentY + 7);
      pdf.text('Amount', 170, currentY + 7, { align: 'right' });

      currentY += 15;

      // Table items
      pdf.setFont('helvetica', 'normal');
      data.items.forEach((item) => {
        pdf.text(item.description, 25, currentY);
        pdf.text(formatCurrency(item.amount), 185, currentY, { align: 'right' });
        currentY += 8;
      });

      // Totals section
      currentY += 10;
      const totalsX = 120;

      pdf.setFont('helvetica', 'normal');
      pdf.text('Subtotal:', totalsX, currentY);
      pdf.text(formatCurrency(data.subtotal), 185, currentY, { align: 'right' });
      currentY += 8;

      pdf.text(`Tax (${data.taxRate}%):`, totalsX, currentY);
      pdf.text(formatCurrency(data.taxAmount), 185, currentY, { align: 'right' });
      currentY += 8;

      // Total line
      pdf.setDrawColor(...primaryColor);
      pdf.setLineWidth(0.5);
      pdf.line(totalsX, currentY, 185, currentY);
      currentY += 5;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Total:', totalsX, currentY);
      pdf.text(formatCurrency(data.total), 185, currentY, { align: 'right' });

      // Notes section
      if (data.notes) {
        currentY += 20;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes:', 20, currentY);
        currentY += 8;
        pdf.setFont('helvetica', 'normal');
        
        // Split notes into lines to fit width
        const notes = pdf.splitTextToSize(data.notes, 170);
        pdf.text(notes, 20, currentY);
      }

      // Footer
      const footerY = 280;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Thank you for your business!', 105, footerY, { align: 'center' });

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Upload PDF to Supabase storage (if configured)
   */
  async uploadPDFToStorage(pdfBlob: Blob, filename: string): Promise<string> {
    // This would integrate with Supabase storage
    // For now, we'll return a placeholder URL
    // In a real implementation, you'd upload to Supabase storage bucket
    
    console.log('PDF upload to storage not implemented yet');
    return `https://placeholder-storage.com/${filename}`;
  }

  /**
   * Download PDF blob as file
   */
  downloadPDF(pdfBlob: Blob, filename: string): void {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const pdfService = PDFService.getInstance(); 