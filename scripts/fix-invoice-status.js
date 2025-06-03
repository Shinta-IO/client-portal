// Fix invoice status when webhook fails
const invoiceId = 'caaad978-5be6-4352-803a-03c75b79a7cd';

fetch('http://localhost:3000/api/test-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    invoiceId: invoiceId,
    action: 'mark_paid'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Invoice status update result:', data);
})
.catch(error => {
  console.error('❌ Error updating invoice:', error);
}); 