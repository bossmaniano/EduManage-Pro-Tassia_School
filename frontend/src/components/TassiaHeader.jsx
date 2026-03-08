// Tassia School Branding Header Component
export default function TassiaHeader() {
  return (
    <div className="text-center border-b-2 border-black pb-4 mb-6">
      {/* Logo })
      <div className="mb-2">
        <img 
          src="/Gemini_Generated_Image_5b5e1a5b5e1a5b5e.png" 
          alt="Tassia School Logo" 
          className="w-24 h-24 mx-auto object-contain"
        />
      </div>
      
      {/* School Name */}
      <h1 className="text-2xl font-black text-black uppercase tracking-wider">TASSIA SCHOOL</h1>
      
      {/* Motto */}
      <p className="text-sm italic text-gray-600">"Quest for Quality"</p>
      
      {/* Address */}
      <div className="text-xs mt-2 text-gray-700">
        <p>P.O Box 35235-00200, Nairobi | Tel: +254 020 82 0017, Cellphone: 0722 803 400</p>
      </div>
    </div>
  );
}
