// Homa Health Care - Diabetes Program Integration
const SUPABASE_URL = 'https://oztndjdowoewkbeznjvd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dG5kamRvd29ld2tiZXpuanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODkyMzksImV4cCI6MjA3MDY2NTIzOX0.yr6CC6zdXFzGOmwHARJwWlSaAmwOWH1VnvcODtdNwAc'

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Enhanced Patient Enrollment Function
async function enhanceExistingPatient(leadData) {
    try {
        console.log('🏥 Enhancing patient for diabetes program:', leadData.name || leadData.first_name)
        
        const enhancedData = {
            first_name: leadData.name?.split(' ')[0] || leadData.first_name || '',
            last_name: leadData.name?.split(' ').slice(1).join(' ') || leadData.last_name || '',
            email: leadData.email,
            phone: leadData.phone || leadData.mobile || leadData.phoneNumber,
            age: leadData.age || null,
            diabetes_type: leadData.diabetes_type || 'type2',
            current_medications: leadData.medications || leadData.currentMedications || '',
            program_status: 'active',
            days_completed: 0,
            total_program_days: 90,
            next_reminder_date: getNextReminderDate(),
            enrollment_date: new Date().toISOString(),
            source: 'enhanced_lead_system',
            notes: `Auto-enrolled via enhanced lead system on ${new Date().toLocaleDateString()}`
        }

        const { data, error } = await supabase
            .from('patients')
            .insert([enhancedData])
            .select()

        if (error) {
            console.error('❌ Diabetes enrollment failed:', error)
            return { success: false, error: error.message }
        }

        console.log('✅ Patient enrolled in diabetes program:', data[0])
        
        return { 
            success: true, 
            patient: data[0],
            message: `${enhancedData.first_name} ${enhancedData.last_name} enrolled in diabetes program!`
        }
        
    } catch (error) {
        console.error('❌ Enhancement error:', error)
        return { success: false, error: error.message }
    }
}

function getNextReminderDate() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString()
}

// Auto-enhance existing forms
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Diabetes Program Integration Active')
    
    const forms = document.querySelectorAll('form')
    
    forms.forEach(form => {
        form.addEventListener('submit', async function(event) {
            const formData = new FormData(form)
            const leadData = {}
            
            for (let [key, value] of formData.entries()) {
                leadData[key] = value
            }
            
            // Enhanced enrollment (non-blocking)
            setTimeout(async () => {
                try {
                    const result = await enhanceExistingPatient(leadData)
                    if (result.success) {
                        console.log('✅ Diabetes enrollment successful:', result.patient)
                    }
                } catch (error) {
                    console.log('⚠️ Diabetes enrollment failed, but lead processing continued')
                }
            }, 500)
        })
    })
})

console.log('🚀 Enhanced Patient System Loaded!')