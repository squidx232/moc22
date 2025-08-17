import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { 
  Save, 
  Upload, 
  X, 
  FileText, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  HelpCircle,
  Plus
} from 'lucide-react';

interface CreateMocFormProps {
  onSuccess: (mocId: Id<"mocRequests">) => void;
  currentUser: any;
  mocToEdit?: any;
}

// Arabic tooltips for form sections
const arabicTooltips = {
  title: "أدخل عنوان واضح ومختصر لطلب التغيير",
  description: "اكتب وصف مفصل للتغيير المطلوب وأسبابه",
  assignedTo: "اختر الشخص المسؤول عن تنفيذ هذا التغيير",
  requestedByDepartment: "حدد القسم الذي يطلب هذا التغيير",
  technicalAuthority: "اختر الخبير التقني المسؤول عن المراجعة النهائية (اختياري)",
  reasonForChange: "اشرح الأسباب التفصيلية وراء الحاجة لهذا التغيير",
  changeType: "حدد نوع التغيير المطلوب",
  changeCategory: "اختر فئة التغيير المناسبة",
  departmentsAffected: "حدد جميع الأقسام التي ستتأثر بهذا التغيير",
  riskAssessment: "هل يتطلب هذا التغيير تقييم مخاطر؟",
  impactAssessment: "اكتب تقييم تأثير التغيير على العمليات",
  hseImpactAssessment: "قيم تأثير التغيير على الصحة والسلامة والبيئة",
  riskEvaluation: "قدم تقييم شامل للمخاطر المحتملة",
  preChangeCondition: "اوصف الحالة الحالية قبل التغيير",
  postChangeCondition: "اوصف الحالة المتوقعة بعد التغيير",
  supportingDocuments: "أضف ملاحظات حول المستندات الداعمة",
  stakeholderReview: "اذكر أصحاب المصلحة المطلوب مراجعتهم",
  training: "هل يتطلب التغيير تدريب للموظفين؟",
  trainingDetails: "اكتب تفاصيل التدريب المطلوب",
  implementationDates: "حدد تواريخ التنفيذ المخطط لها",
  implementationOwner: "اكتب اسم المسؤول عن التنفيذ",
  verification: "اوصف كيفية التحقق من اكتمال التغيير",
  postImplementationReview: "اكتب خطة مراجعة ما بعد التنفيذ",
  closeoutApproval: "اذكر من سيوافق على إغلاق المشروع",
  additionalApprovers: "اختر مراجعين إضافيين للموافقة النهائية",
  viewers: "اختر الأشخاص الذين يمكنهم عرض هذا الطلب"
};

// Tooltip component
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-2">
    <Info size={16} className="text-blue-500 cursor-help" />
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
      <div className="break-words whitespace-normal">{text}</div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
    </div>
  </div>
);

export default function CreateMocForm({ onSuccess, currentUser, mocToEdit }: CreateMocFormProps) {
  const isEditing = !!mocToEdit;
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: '',
    requestedByDepartment: '',
    technicalAuthorityId: '', // New field for technical authority
    reasonForChange: '',
    changeType: '',
    changeCategory: '',
    changeCategoryOther: '',
    departmentsAffected: [] as string[],
    riskAssessmentRequired: false,
    impactAssessment: '',
    hseImpactAssessment: '',
    riskEvaluation: '',
    riskLevelPreMitigation: '',
    riskMatrixPreMitigation: '',
    riskLevelPostMitigation: '',
    riskMatrixPostMitigation: '',
    preChangeCondition: '',
    postChangeCondition: '',
    supportingDocumentsNotes: '',
    stakeholderReviewApprovalsText: '',
    trainingRequired: false,
    trainingDetails: '',
    startDateOfChange: '',
    expectedCompletionDate: '',
    deadline: '',
    implementationOwner: '',
    verificationOfCompletionText: '',
    postImplementationReviewText: '',
    closeoutApprovedByText: '',
    additionalApproverUserIds: [] as string[],
    viewerIds: [] as string[],
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const users = useQuery(api.users.listApprovedUsers) || [];
  const departments = useQuery(api.departments.listDepartments) || [];

  // Mutations
  const createMocMutation = useMutation(api.moc.createMocRequest);
  const updateMocMutation = useMutation(api.moc.updateMocRequest);
  const generateUploadUrlMutation = useMutation(api.moc.generateUploadUrl);
  const addAttachmentMutation = useMutation(api.moc.addAttachment);

  // Users are already filtered to approved users by the query
  const approvedUsers = users;

  // Populate form when editing
  useEffect(() => {
    if (isEditing && mocToEdit) {
      setFormData({
        title: mocToEdit.title || '',
        description: mocToEdit.description || '',
        assignedToId: mocToEdit.assignedToId || '',
        requestedByDepartment: mocToEdit.requestedByDepartment || '',
        technicalAuthorityId: mocToEdit.technicalAuthorityId || '', // New field
        reasonForChange: mocToEdit.reasonForChange || '',
        changeType: mocToEdit.changeType || '',
        changeCategory: mocToEdit.changeCategory || '',
        changeCategoryOther: mocToEdit.changeCategoryOther || '',
        departmentsAffected: mocToEdit.departmentsAffected || [],
        riskAssessmentRequired: mocToEdit.riskAssessmentRequired || false,
        impactAssessment: mocToEdit.impactAssessment || '',
        hseImpactAssessment: mocToEdit.hseImpactAssessment || '',
        riskEvaluation: mocToEdit.riskEvaluation || '',
        riskLevelPreMitigation: mocToEdit.riskLevelPreMitigation || '',
        riskMatrixPreMitigation: mocToEdit.riskMatrixPreMitigation || '',
        riskLevelPostMitigation: mocToEdit.riskLevelPostMitigation || '',
        riskMatrixPostMitigation: mocToEdit.riskMatrixPostMitigation || '',
        preChangeCondition: mocToEdit.preChangeCondition || '',
        postChangeCondition: mocToEdit.postChangeCondition || '',
        supportingDocumentsNotes: mocToEdit.supportingDocumentsNotes || '',
        stakeholderReviewApprovalsText: mocToEdit.stakeholderReviewApprovalsText || '',
        trainingRequired: mocToEdit.trainingRequired || false,
        trainingDetails: mocToEdit.trainingDetails || '',
        startDateOfChange: mocToEdit.startDateOfChange ? new Date(mocToEdit.startDateOfChange).toISOString().split('T')[0] : '',
        expectedCompletionDate: mocToEdit.expectedCompletionDate ? new Date(mocToEdit.expectedCompletionDate).toISOString().split('T')[0] : '',
        deadline: mocToEdit.deadline ? new Date(mocToEdit.deadline).toISOString().split('T')[0] : '',
        implementationOwner: mocToEdit.implementationOwner || '',
        verificationOfCompletionText: mocToEdit.verificationOfCompletionText || '',
        postImplementationReviewText: mocToEdit.postImplementationReviewText || '',
        closeoutApprovedByText: mocToEdit.closeoutApprovedByText || '',
        additionalApproverUserIds: mocToEdit.additionalApproverUserIds || [],
        viewerIds: mocToEdit.viewerIds || [],
      });
    }
  }, [isEditing, mocToEdit]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMultiSelectChange = (field: string, value: string) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof typeof prev] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?._id) {
      toast.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the data
      const submitData: any = {
        title: formData.title,
        description: formData.description,
        reasonForChange: formData.reasonForChange || undefined,
        changeType: formData.changeType || undefined,
        changeCategory: formData.changeCategory || undefined,
        changeCategoryOther: formData.changeCategoryOther || undefined,
        assignedToId: formData.assignedToId ? formData.assignedToId as Id<"users"> : undefined,
        requestedByDepartment: formData.requestedByDepartment ? formData.requestedByDepartment as Id<"departments"> : undefined,
        technicalAuthorityId: formData.technicalAuthorityId ? formData.technicalAuthorityId as Id<"users"> : undefined, // New field
        departmentsAffected: formData.departmentsAffected.length > 0 ? formData.departmentsAffected.map(id => id as Id<"departments">) : undefined,
        riskAssessmentRequired: formData.riskAssessmentRequired,
        impactAssessment: formData.impactAssessment || undefined,
        hseImpactAssessment: formData.hseImpactAssessment || undefined,
        riskEvaluation: formData.riskEvaluation || undefined,
        riskLevelPreMitigation: formData.riskLevelPreMitigation || undefined,
        riskMatrixPreMitigation: formData.riskMatrixPreMitigation || undefined,
        riskLevelPostMitigation: formData.riskLevelPostMitigation || undefined,
        riskMatrixPostMitigation: formData.riskMatrixPostMitigation || undefined,
        startDateOfChange: formData.startDateOfChange ? new Date(formData.startDateOfChange).getTime() : undefined,
        expectedCompletionDate: formData.expectedCompletionDate ? new Date(formData.expectedCompletionDate).getTime() : undefined,
        deadline: formData.deadline ? new Date(formData.deadline).getTime() : undefined,
        preChangeCondition: formData.preChangeCondition || undefined,
        postChangeCondition: formData.postChangeCondition || undefined,
        supportingDocumentsNotes: formData.supportingDocumentsNotes || undefined,
        stakeholderReviewApprovalsText: formData.stakeholderReviewApprovalsText || undefined,
        trainingRequired: formData.trainingRequired,
        trainingDetails: formData.trainingDetails || undefined,
        implementationOwner: formData.implementationOwner || undefined,
        verificationOfCompletionText: formData.verificationOfCompletionText || undefined,
        postImplementationReviewText: formData.postImplementationReviewText || undefined,
        closeoutApprovedByText: formData.closeoutApprovedByText || undefined,
        additionalApproverUserIds: formData.additionalApproverUserIds.length > 0 ? formData.additionalApproverUserIds.map(id => id as Id<"users">) : undefined,
        viewerIds: formData.viewerIds.length > 0 ? formData.viewerIds.map(id => id as Id<"users">) : undefined,
        requestingUserId: currentUser._id,
      };

      let mocId: Id<"mocRequests">;

      if (isEditing && mocToEdit) {
        await updateMocMutation({
          id: mocToEdit._id,
          ...submitData,
        });
        mocId = mocToEdit._id;
        toast.success('RFC updated successfully');
      } else {
        mocId = await createMocMutation(submitData);
        toast.success('RFC created successfully');
      }

      // Handle file uploads
      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            const uploadUrl = await generateUploadUrlMutation({ requestingUserId: currentUser._id });
            const result = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': file.type },
              body: file,
            });

            if (!result.ok) {
              throw new Error(`Upload failed: ${result.statusText}`);
            }

            const { storageId } = await result.json();
            await addAttachmentMutation({
              mocRequestId: mocId,
              storageId,
              fileName: file.name,
              fileType: file.type,
              requestingUserId: currentUser._id,
            });
          } catch (error) {
            console.error('File upload error:', error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      onSuccess(mocId);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} RFC: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={24} />
          {isEditing ? 'Edit RFC' : 'Create New RFC'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing ? 'Update the RFC details below' : 'Fill out the form below to create a new Request for Change'}
        </p>
      </div>

      {isEditing && mocToEdit && (mocToEdit.status === 'pending_department_approval' || mocToEdit.status === 'pending_final_review') && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">Editing During Approval Process</h3>
              <p className="text-sm text-amber-700 mt-1">
                This RFC is currently {mocToEdit.status === 'pending_department_approval' ? 'pending department approval' : 'pending final review'}. 
                Making changes will reset the RFC to draft status and require re-approval from all departments.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Basic Information */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                RFC Title *
                <InfoTooltip text={arabicTooltips.title} />
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm break-words"
                placeholder="Enter a clear and concise title for the RFC"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Description *
                <InfoTooltip text={arabicTooltips.description} />
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
                placeholder="Provide a detailed description of the change request"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Assigned To
                <InfoTooltip text={arabicTooltips.assignedTo} />
              </label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleInputChange('assignedToId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              >
                <option value="">Select assignee</option>
                {approvedUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    <span className="truncate">{user.name || user.email}</span>
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Requesting Department
                <InfoTooltip text={arabicTooltips.requestedByDepartment} />
              </label>
              <select
                value={formData.requestedByDepartment}
                onChange={(e) => handleInputChange('requestedByDepartment', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              >
                <option value="">Select department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>
                    <span className="truncate">{dept.name}</span>
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Technical Authority (Final Reviewer)
                <InfoTooltip text={arabicTooltips.technicalAuthority} />
              </label>
              <select
                value={formData.technicalAuthorityId}
                onChange={(e) => handleInputChange('technicalAuthorityId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              >
                <option value="">No technical authority (auto-approve after departments)</option>
                {approvedUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    <span className="truncate">{user.name || user.email}</span>
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1 break-words">
                If selected, only this person can provide final approval. If not selected, RFC will be auto-approved after all department approvals.
              </p>
            </div>
          </div>
        </section>

        {/* Change Details */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Change Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Reason for Change
              <InfoTooltip text={arabicTooltips.reasonForChange} />
            </label>
            <textarea
              rows={3}
              value={formData.reasonForChange}
              onChange={(e) => handleInputChange('reasonForChange', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
              placeholder="Explain the detailed reasons behind the need for this change"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Change Type
                <InfoTooltip text={arabicTooltips.changeType} />
              </label>
              <select
                value={formData.changeType}
                onChange={(e) => handleInputChange('changeType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              >
                <option value="">Select type</option>
                <option value="temporary">Temporary</option>
                <option value="permanent">Permanent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Change Category
                <InfoTooltip text={arabicTooltips.changeCategory} />
              </label>
              <select
                value={formData.changeCategory}
                onChange={(e) => handleInputChange('changeCategory', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              >
                <option value="">Select category</option>
                <option value="process">Process Change</option>
                <option value="equipment">Equipment Change</option>
                <option value="software">Software Change</option>
                <option value="procedure">Procedure Change</option>
                <option value="organizational">Organizational Change</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.changeCategory === 'other' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Category (Please specify)
                </label>
                <input
                  type="text"
                  value={formData.changeCategoryOther}
                  onChange={(e) => handleInputChange('changeCategoryOther', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm break-words"
                  placeholder="Please specify the change category"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Departments Affected
              <InfoTooltip text={arabicTooltips.departmentsAffected} />
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-gray-300 rounded-lg shadow-sm">
              {departments.map(dept => (
                <label key={dept._id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.departmentsAffected.includes(dept._id)}
                    onChange={() => handleMultiSelectChange('departmentsAffected', dept._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 truncate">{dept.name}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Risk Assessment */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Risk Assessment
          </h2>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.riskAssessmentRequired}
                onChange={(e) => handleInputChange('riskAssessmentRequired', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center">
                Risk Assessment Required
                <InfoTooltip text={arabicTooltips.riskAssessment} />
              </span>
            </label>
          </div>

          {formData.riskAssessmentRequired && (
            <div className="space-y-6 pl-6 border-l-4 border-blue-200 bg-blue-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Impact Assessment
                  <InfoTooltip text={arabicTooltips.impactAssessment} />
                </label>
                <textarea
                  rows={3}
                  value={formData.impactAssessment}
                  onChange={(e) => handleInputChange('impactAssessment', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm bg-white break-words"
                  placeholder="Describe the impact of this change on operations"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  HSE Impact Assessment
                  <InfoTooltip text={arabicTooltips.hseImpactAssessment} />
                </label>
                <textarea
                  rows={3}
                  value={formData.hseImpactAssessment}
                  onChange={(e) => handleInputChange('hseImpactAssessment', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm bg-white break-words"
                  placeholder="Assess the impact on Health, Safety, and Environment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Risk Evaluation
                  <InfoTooltip text={arabicTooltips.riskEvaluation} />
                </label>
                <textarea
                  rows={3}
                  value={formData.riskEvaluation}
                  onChange={(e) => handleInputChange('riskEvaluation', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm bg-white break-words"
                  placeholder="Provide a comprehensive evaluation of potential risks"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Level (Pre-Mitigation)
                    </label>
                    <select
                      value={formData.riskLevelPreMitigation}
                      onChange={(e) => handleInputChange('riskLevelPreMitigation', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm bg-white"
                    >
                      <option value="">Select risk level</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Matrix (Pre-Mitigation)
                    </label>
                    <input
                      type="text"
                      value={formData.riskMatrixPreMitigation}
                      onChange={(e) => handleInputChange('riskMatrixPreMitigation', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm bg-white break-words"
                      placeholder="Enter risk matrix value (e.g., A1, B2, C3)"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Level (Post-Mitigation)
                    </label>
                    <select
                      value={formData.riskLevelPostMitigation}
                      onChange={(e) => handleInputChange('riskLevelPostMitigation', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm bg-white"
                    >
                <option value="">Select risk level</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Matrix (Post-Mitigation)
                    </label>
                    <input
                      type="text"
                      value={formData.riskMatrixPostMitigation}
                      onChange={(e) => handleInputChange('riskMatrixPostMitigation', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm bg-white break-words"
                      placeholder="Enter risk matrix value (e.g., A1, B2, C3)"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Implementation Details */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Implementation Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Pre-Change Condition
                <InfoTooltip text={arabicTooltips.preChangeCondition} />
              </label>
              <textarea
                rows={3}
                value={formData.preChangeCondition}
                onChange={(e) => handleInputChange('preChangeCondition', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
                placeholder="Describe the current state before the change"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Post-Change Condition
                <InfoTooltip text={arabicTooltips.postChangeCondition} />
              </label>
              <textarea
                rows={3}
                value={formData.postChangeCondition}
                onChange={(e) => handleInputChange('postChangeCondition', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
                placeholder="Describe the expected state after the change"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Supporting Documents Notes
              <InfoTooltip text={arabicTooltips.supportingDocuments} />
            </label>
            <textarea
              rows={2}
              value={formData.supportingDocumentsNotes}
              onChange={(e) => handleInputChange('supportingDocumentsNotes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
              placeholder="Add notes about supporting documents"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Stakeholder Review & Approvals
              <InfoTooltip text={arabicTooltips.stakeholderReview} />
            </label>
            <textarea
              rows={2}
              value={formData.stakeholderReviewApprovalsText}
              onChange={(e) => handleInputChange('stakeholderReviewApprovalsText', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
              placeholder="List stakeholders who need to review this change"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.trainingRequired}
                onChange={(e) => handleInputChange('trainingRequired', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center">
                Training Required
                <InfoTooltip text={arabicTooltips.training} />
              </span>
            </label>
          </div>

          {formData.trainingRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Training Details
                <InfoTooltip text={arabicTooltips.trainingDetails} />
              </label>
              <textarea
                rows={3}
                value={formData.trainingDetails}
                onChange={(e) => handleInputChange('trainingDetails', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
                placeholder="Describe the training requirements"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Start Date
                <InfoTooltip text={arabicTooltips.implementationDates} />
              </label>
              <input
                type="date"
                value={formData.startDateOfChange}
                onChange={(e) => handleInputChange('startDateOfChange', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Completion
              </label>
              <input
                type="date"
                value={formData.expectedCompletionDate}
                onChange={(e) => handleInputChange('expectedCompletionDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Implementation Owner
              <InfoTooltip text={arabicTooltips.implementationOwner} />
            </label>
            <input
              type="text"
              value={formData.implementationOwner}
              onChange={(e) => handleInputChange('implementationOwner', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm break-words"
              placeholder="Name of the person responsible for implementation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Verification of Completion
              <InfoTooltip text={arabicTooltips.verification} />
            </label>
            <textarea
              rows={2}
              value={formData.verificationOfCompletionText}
              onChange={(e) => handleInputChange('verificationOfCompletionText', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
              placeholder="Describe how completion will be verified"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Post-Implementation Review
              <InfoTooltip text={arabicTooltips.postImplementationReview} />
            </label>
            <textarea
              rows={2}
              value={formData.postImplementationReviewText}
              onChange={(e) => handleInputChange('postImplementationReviewText', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
              placeholder="Describe the post-implementation review plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Closeout Approval
              <InfoTooltip text={arabicTooltips.closeoutApproval} />
            </label>
            <textarea
              rows={2}
              value={formData.closeoutApprovedByText}
              onChange={(e) => handleInputChange('closeoutApprovedByText', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical shadow-sm break-words"
              placeholder="Who will approve the project closeout"
            />
          </div>
        </section>

        {/* Additional Approvers and Viewers */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Access Control
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Additional Approvers (Final Review)
              <InfoTooltip text={arabicTooltips.additionalApprovers} />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-gray-300 rounded-lg shadow-sm max-h-48 overflow-y-auto">
              {approvedUsers.map(user => (
                <label key={user._id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.additionalApproverUserIds.includes(user._id)}
                    onChange={() => handleMultiSelectChange('additionalApproverUserIds', user._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 truncate">{user.name || user.email}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1 break-words">
              Note: If a Technical Authority is selected above, only they can provide final approval. Additional approvers will be ignored.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Viewers
              <InfoTooltip text={arabicTooltips.viewers} />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-gray-300 rounded-lg shadow-sm max-h-48 overflow-y-auto">
              {approvedUsers.map(user => (
                <label key={user._id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.viewerIds.includes(user._id)}
                    onChange={() => handleMultiSelectChange('viewerIds', user._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 truncate">{user.name || user.email}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* File Attachments */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Attachments
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Supporting Documents
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              />
              <button
                type="button"
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                className="flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <Plus size={16} />
                <span>Add More</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1 break-words">
              Supported formats: PDF, Word, Excel, PowerPoint, Text, Images. You can select multiple files at once.
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Selected Files:</h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText size={16} className="text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEditing ? 'Update RFC' : 'Create RFC'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
